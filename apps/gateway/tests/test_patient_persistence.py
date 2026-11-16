import asyncio
import copy
import json

import httpx
import pytest

from routers import orchestrator
from services import patient_service, supabase_reports
from services.supabase_reports import PatientPersistenceError


@pytest.fixture
def database(monkeypatch):
    state = {
        'row': {'patient_id': 'TEST', 'prescribed_action': 'Apixaban 5 mg oral twice daily',
                'updated_at': '2026-01-01T00:00:00+00:00',
                'clinical_data': {'medications': ['Apixaban 5 mg oral twice daily'], 'adjudication_reports': [{'report_id': 'existing'}]}},
        'read_status': 200, 'write_status': 200, 'empty_write': False, 'mismatch': False,
        'calls': [],
    }
    original_client = httpx.Client

    def handle(request):
        state['calls'].append(request)
        if request.method == 'GET':
            return httpx.Response(state['read_status'], json=[copy.deepcopy(state['row'])] if state['row'] else [])
        assert request.method == 'PATCH'
        assert request.headers['prefer'] == 'return=representation'
        assert request.url.params['patient_id'] == 'eq.TEST'
        assert request.url.params['updated_at'] == 'eq.' + state['row']['updated_at']
        if state['write_status'] != 200:
            return httpx.Response(state['write_status'])
        if state['empty_write']:
            return httpx.Response(200, json=[])
        state['row'].update(json.loads(request.content))
        returned = copy.deepcopy(state['row'])
        if state['mismatch']:
            returned['prescribed_action'] = 'Apixaban 5 mg oral twice daily'
        return httpx.Response(200, json=[returned])

    monkeypatch.setattr(supabase_reports, '_config', lambda: ('https://database.test', 'test-key'))
    monkeypatch.setattr(supabase_reports.httpx, 'Client', lambda **kwargs: original_client(transport=httpx.MockTransport(handle), **kwargs))
    return state


def update_fields():
    return {'prescribed_action': 'Apixaban 10 mg oral twice daily',
            'medications': ['Apixaban 10 mg oral twice daily'],
            'dosage_instructions': {'dose': 10, 'unit': 'mg', 'route': 'oral', 'frequency': 'twice daily'}}


def test_save_returns_verified_database_receipt_and_preserves_other_fields(database):
    receipt = supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())
    assert receipt['verified'] is True
    assert receipt['storage'] == 'supabase'
    assert receipt['prescribed_action'] == database['row']['prescribed_action'] == update_fields()['prescribed_action']
    assert database['row']['clinical_data']['adjudication_reports'] == [{'report_id': 'existing'}]
    assert database['row']['clinical_data']['dosage_instructions'] == update_fields()['dosage_instructions']


@pytest.mark.parametrize('status', [401, 403, 500, 503])
def test_database_read_failure_never_writes(database, status):
    database['read_status'] = status
    with pytest.raises(PatientPersistenceError):
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())
    assert [request.method for request in database['calls']] == ['GET']


@pytest.mark.parametrize('status', [204, 400, 403, 500])
def test_unconfirmed_write_is_not_success(database, status):
    database['write_status'] = status
    with pytest.raises(PatientPersistenceError):
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())


def test_missing_patient_is_not_silently_created(database):
    database['row'] = None
    with pytest.raises(PatientPersistenceError) as error:
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())
    assert error.value.status_code == 404
    assert len(database['calls']) == 1


def test_zero_updated_rows_is_a_conflict(database):
    database['empty_write'] = True
    with pytest.raises(PatientPersistenceError) as error:
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())
    assert error.value.status_code == 409


def test_returned_order_must_match_the_requested_order(database):
    database['mismatch'] = True
    with pytest.raises(PatientPersistenceError):
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())


def test_missing_credentials_are_an_error(monkeypatch):
    monkeypatch.setattr(supabase_reports, '_config', lambda: (None, None))
    with pytest.raises(PatientPersistenceError):
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())


def test_network_failure_cannot_confirm_a_save(monkeypatch):
    original_client = httpx.Client
    def unreachable(request):
        raise httpx.ConnectError('Test DNS failure', request=request)
    monkeypatch.setattr(supabase_reports, '_config', lambda: ('https://database.test', 'test-key'))
    monkeypatch.setattr(supabase_reports.httpx, 'Client', lambda **kwargs: original_client(transport=httpx.MockTransport(unreachable), **kwargs))
    with pytest.raises(PatientPersistenceError) as error:
        supabase_reports.sync_patient_data_to_supabase('TEST', update_fields())
    assert error.value.status_code == 503


def test_report_append_cannot_overwrite_a_concurrent_prescription(monkeypatch, tmp_path):
    state = {'row': {'patient_id': 'TEST', 'updated_at': 'initial',
                     'clinical_data': {'medications': ['Apixaban 5 mg oral twice daily']}}, 'patches': 0}
    original_client = httpx.Client
    def handle(request):
        if request.method == 'GET':
            return httpx.Response(200, json=[copy.deepcopy(state['row'])])
        state['patches'] += 1
        if state['patches'] == 1:
            # A confirmed order arrives after the report writer's first read.
            state['row']['updated_at'] = 'concurrent-save'
            state['row']['clinical_data']['medications'] = ['Apixaban 10 mg oral twice daily']
        if request.url.params['updated_at'] != 'eq.' + state['row']['updated_at']:
            return httpx.Response(200, json=[])
        state['row'].update(json.loads(request.content))
        return httpx.Response(200, json=[copy.deepcopy(state['row'])])
    monkeypatch.setattr(supabase_reports, '_config', lambda: ('https://database.test', 'test-key'))
    monkeypatch.setattr(supabase_reports, 'LOCAL_STORE_PATH', tmp_path / 'reports.json')
    monkeypatch.setattr(supabase_reports, '_IN_MEMORY_REPORTS', {})
    monkeypatch.setattr(supabase_reports.httpx, 'Client', lambda **kwargs: original_client(transport=httpx.MockTransport(handle), **kwargs))
    report = supabase_reports.append_final_report('TEST', {'summary': 'Synthetic test result'})
    assert state['patches'] == 2
    assert state['row']['clinical_data']['medications'] == ['Apixaban 10 mg oral twice daily']
    assert state['row']['clinical_data']['adjudication_reports'][0]['report_id'] == report['report_id']


@pytest.mark.parametrize('failure', ['exception', 'false', 'none'])
def test_failed_save_leaves_memory_and_disk_unchanged(monkeypatch, tmp_path, failure):
    record = {'patient_id': 'TEST', 'patient': {'medications': ['Apixaban 5 mg oral twice daily']}}
    cache = {'TEST': copy.deepcopy(record)}
    path = tmp_path / 'patients.json'
    path.write_text(json.dumps({'patients': [record]}))
    original = path.read_bytes()
    monkeypatch.setattr(patient_service, '_PATIENTS_CACHE', cache)
    monkeypatch.setattr(patient_service, 'CANDIDATE_PATHS', [path])
    def fail(*args):
        if failure == 'exception':
            raise PatientPersistenceError('Database is unavailable')
        return False if failure == 'false' else None
    monkeypatch.setattr(supabase_reports, 'sync_patient_data_to_supabase', fail)
    with pytest.raises(PatientPersistenceError):
        patient_service.update_patient_in_cache('TEST', prescribed_action='Apixaban 10 mg oral twice daily', dosage=10)
    assert cache['TEST'] == record
    assert path.read_bytes() == original


def test_database_save_survives_local_mirror_failure_and_restart(monkeypatch, tmp_path, database):
    old_record = {'patient_id': 'TEST', 'patient': {'medications': ['Apixaban 5 mg oral twice daily']}}
    path = tmp_path / 'patients.json'
    path.write_text(json.dumps({'patients': [old_record]}))
    monkeypatch.setattr(patient_service, '_PATIENTS_CACHE', {'TEST': copy.deepcopy(old_record)})
    monkeypatch.setattr(patient_service, 'CANDIDATE_PATHS', [path])
    monkeypatch.setattr(patient_service, '_mirror_patient_update', lambda *args: False)
    receipt = patient_service.update_patient_in_cache('TEST', prescribed_action='Apixaban 10 mg oral twice daily', dosage=10)
    assert receipt['verified'] is True and receipt['local_mirror_saved'] is False
    assert path.read_text() == json.dumps({'patients': [old_record]})
    patient_service._PATIENTS_CACHE = None
    assert patient_service.get_patient_profile('TEST')['patient']['medications'] == ['Apixaban 10 mg oral twice daily']


def test_unconfirmed_modification_never_calls_the_database(monkeypatch):
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', lambda **kw: pytest.fail('Unconfirmed change was saved'))
    with pytest.raises(orchestrator.HTTPException) as error:
        asyncio.run(orchestrator.resume_orchestrator({'patientId': 'TEST', 'modifications': []}))
    assert error.value.status_code == 400


@pytest.mark.parametrize('changes', [{'proposed_dosage': True}, {'prescribed_action': 'Apixaban 2 mg oral twice daily'}])
def test_inconsistent_confirmation_never_saves(monkeypatch, changes):
    monkeypatch.setattr(orchestrator, 'runs', {'TEST': {'rag_output': {}, 'result': {'prescribed_action': 'Apixaban 5 mg oral twice daily'}}})
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', lambda **kw: pytest.fail('Invalid confirmation was saved'))
    mod = {'dosage_name': 'Apixaban', 'proposed_dosage': 10, 'dosage_unit': 'mg', 'route': 'oral', 'frequency': 'twice daily'}
    payload = {'patientId': 'TEST', 'confirmed': True, 'modifications': [mod]}
    if 'proposed_dosage' in changes:
        mod.update(changes)
    else:
        payload.update(changes)
    with pytest.raises(orchestrator.HTTPException) as error:
        asyncio.run(orchestrator.resume_orchestrator(payload))
    assert error.value.status_code == 400


def test_starting_an_evaluation_does_not_save_unconfirmed_patient_fields(monkeypatch):
    monkeypatch.setattr(orchestrator, 'runs', {})
    monkeypatch.setattr(orchestrator, 'run_tasks', {})
    monkeypatch.setattr(orchestrator, '_simulated_rag_output', lambda *args: {})
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', lambda **kw: pytest.fail('Evaluation start wrote patient fields'))
    async def evaluate(*args):
        pass
    monkeypatch.setattr(orchestrator, '_execute_run', evaluate)
    async def scenario():
        result = await orchestrator.start_run({'patientId': 'TEST', 'prescribed_action': 'Apixaban 5 mg oral twice daily', 'patient': {'age': 45, 'sex': 'female'}})
        assert result['status'] == 'started'
        await orchestrator.run_tasks['TEST']
    asyncio.run(scenario())


def test_simultaneous_resume_requests_save_only_once(monkeypatch):
    monkeypatch.setattr(orchestrator, 'runs', {'TEST': {'rag_output': {}, 'result': {'prescribed_action': 'Apixaban 5 mg oral twice daily'}}})
    monkeypatch.setattr(orchestrator, 'run_tasks', {})
    monkeypatch.setattr(orchestrator, '_resume_locks', {})
    monkeypatch.setattr(orchestrator, 'extract_patient_clinical_package', lambda _: {})
    saves = []
    def save(**kwargs):
        saves.append(kwargs)
        return {'storage': 'supabase', 'verified': True, 'patient_id': 'TEST', 'prescribed_action': kwargs['prescribed_action']}
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', save)
    async def scenario():
        finished = asyncio.Event()
        async def evaluate(*args, **kwargs):
            await finished.wait()
        monkeypatch.setattr(orchestrator, '_execute_run', evaluate)
        payload = {'patientId': 'TEST', 'confirmed': True, 'modifications': [
            {'dosage_name': 'Apixaban', 'proposed_dosage': 10, 'dosage_unit': 'mg', 'route': 'oral', 'frequency': 'twice daily'}]}
        results = await asyncio.gather(orchestrator.resume_orchestrator(payload), orchestrator.resume_orchestrator(payload), return_exceptions=True)
        assert len(saves) == 1
        assert sum(isinstance(r, dict) and r.get('status') == 'success' for r in results) == 1
        conflicts = [r for r in results if isinstance(r, orchestrator.HTTPException)]
        assert len(conflicts) == 1 and conflicts[0].status_code == 409
        finished.set()
        await orchestrator.run_tasks['TEST']
    asyncio.run(scenario())


def test_database_failure_does_not_restart_or_replace_a_completed_evaluation(monkeypatch):
    initial = {'rag_output': {}, 'result': {'prescribed_action': 'Apixaban 5 mg oral twice daily'}}
    monkeypatch.setattr(orchestrator, 'runs', {'TEST': copy.deepcopy(initial)})
    monkeypatch.setattr(orchestrator, 'run_tasks', {})
    def fail(**kwargs):
        raise PatientPersistenceError('Database unreachable')
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', fail)
    with pytest.raises(orchestrator.HTTPException) as error:
        asyncio.run(orchestrator.resume_orchestrator({
            'patientId': 'TEST', 'confirmed': True,
            'modifications': [{'dosage_name': 'Apixaban', 'proposed_dosage': 10, 'dosage_unit': 'mg', 'route': 'oral', 'frequency': 'twice daily'}],
        }))
    assert error.value.status_code == 503
    assert orchestrator.runs['TEST'] == initial
    assert orchestrator.run_tasks == {}
