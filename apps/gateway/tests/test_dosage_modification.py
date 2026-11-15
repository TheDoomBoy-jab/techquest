import asyncio
import copy
import json
import httpx
import pytest
from fastapi import FastAPI, HTTPException
from routers import extraction, orchestrator
from services import client_agent, patient_service, supabase_reports
from services.client_agent import _apply_modifications


def test_target_dose_and_route():
    data=extraction._fallback_extract('Give Apixaban; reduce from 40 mg to 5 mg oral twice daily')
    assert data['modifications'][0]['proposed_dosage']==5
    assert data['modifications'][0]['route']=='oral'

@pytest.mark.parametrize('note',['Apixaban','reduce Apixaban','give 5 mg','Apixaban 5 mg or 10 mg','Apixaban 0 mg','Apixaban -5 mg'])
def test_invalid_notes(note):
    assert extraction._fallback_extract(note)['is_valid'] is False


def test_route_and_frequency_survive_modification():
    mod={'dosage_name':'Pembrolizumab','proposed_dosage':200,'dosage_unit':'mg','route':'IV','frequency':'every 3 weeks'}
    assert _apply_modifications('Apixaban 40 mg oral twice daily',[mod])=='Pembrolizumab 200 mg IV every 3 weeks'


def test_two_resumes_keep_updated_medications_and_history(monkeypatch):
    cache={'medications':['Apixaban 40 mg BID']};evaluated=[]
    initial={'prescribed_action':'Apixaban 40 mg oral twice daily','rule_analysis_package':{'patient':copy.deepcopy(cache)}}
    monkeypatch.setattr(orchestrator,'runs',{'TEST':{'rag_output':initial,'result':{'prescribed_action':initial['prescribed_action'],'iteration_count':0,'report_history':[{'iteration':0}]}}})
    monkeypatch.setattr(orchestrator,'run_tasks',{})
    def update(**v):cache['medications']=[v['prescribed_action']];return True
    monkeypatch.setattr(orchestrator,'update_patient_in_cache',update)
    monkeypatch.setattr(orchestrator,'extract_patient_clinical_package',lambda pid:copy.deepcopy(cache))
    async def execute(pid,rag,*args,**kwargs):
        evaluated.append(copy.deepcopy(rag));history=kwargs['report_history']+[{'iteration':rag['refinement_iteration_count']}]
        orchestrator.runs[pid]['result']={'prescribed_action':rag['prescribed_action'],'original_prescribed_action':rag['original_prescribed_action'],'iteration_count':rag['refinement_iteration_count'],'report_history':history}
    monkeypatch.setattr(orchestrator,'_execute_run',execute)
    async def run():
        for dose,freq in [(5,'twice daily'),(2.5,'once daily')]:
            await orchestrator.resume_orchestrator({'patientId':'TEST','modifications':[{'dosage_name':'Apixaban','proposed_dosage':dose,'dosage_unit':'mg','route':'oral','frequency':freq}]})
            await orchestrator.run_tasks['TEST']
    asyncio.run(run())
    assert evaluated[0]['prescribed_action']=='Apixaban 5 mg oral twice daily'
    assert evaluated[1]['prescribed_action']=='Apixaban 2.5 mg oral once daily'
    assert evaluated[1]['rule_analysis_package']['patient']['medications']==['Apixaban 2.5 mg oral once daily']
    assert evaluated[1]['original_prescribed_action']=='Apixaban 40 mg oral twice daily'
    assert len(orchestrator.runs['TEST']['result']['report_history'])==3


def test_invalid_resume_does_not_persist(monkeypatch):
    monkeypatch.setattr(orchestrator,'runs',{'TEST':{'rag_output':{},'result':{'iteration_count':0}}})
    monkeypatch.setattr(orchestrator,'update_patient_in_cache',lambda **kw:pytest.fail('invalid prescription persisted'))
    with pytest.raises(HTTPException) as error:
        asyncio.run(orchestrator.resume_orchestrator({'patientId':'TEST','extraction_details':{'is_valid':False}}))
    assert error.value.status_code==400


@pytest.mark.parametrize('drug,initial_dose,doses,route,frequency', [
    ('Apixaban', 40, [5, 2.5], 'oral', 'twice daily'),
    ('Pembrolizumab', 400, [200, 100], 'IV', 'every 3 weeks'),
])
def test_http_extraction_resume_stream_and_results(
    monkeypatch, tmp_path, drug, initial_dose, doses, route, frequency
):
    """Exercise real routing, storage, coordinator and SSE; isolate external specialists."""
    patient_id = 'DOSE-REGRESSION'
    initial_action = f'{drug} {initial_dose} mg {route} {frequency}'
    record = {
        'patient_id': patient_id,
        'patient': {
            'patient_id': patient_id, 'age': 45, 'sex': 'female',
            'trial_id': 'NCT02415400', 'medications': [initial_action],
            'lab_results': {'creatinine_clearance': {'value': 80}},
        },
    }
    database = tmp_path / 'patients.json'
    database.write_text(json.dumps({'patients': [record]}))
    monkeypatch.setattr(patient_service, '_PATIENTS_CACHE', {patient_id: copy.deepcopy(record)})
    monkeypatch.setattr(patient_service, 'CANDIDATE_PATHS', [database])
    synced = []
    monkeypatch.setattr(supabase_reports, 'sync_patient_data_to_supabase', lambda pid, values: synced.append(copy.deepcopy(values)))
    monkeypatch.setattr(extraction, '_llm', None)
    monkeypatch.setattr(client_agent, 'record_trace', lambda *args, **kwargs: None)
    for name in ('runs', 'run_tasks', 'arbitration_results', 'hitl_packages'):
        monkeypatch.setattr(orchestrator, name, {})
    dispatched = []

    async def specialist(payload, request_id, on_complete=None, agent_name=None):
        dispatched.append(copy.deepcopy(payload))
        result = {
            1: {'compliance_status': 'COMPLIANT', 'violations': [], 'explanation': 'Test specialist'},
            2: {'safety_status': 'SAFE', 'concerns': [], 'explanation': 'Test specialist'},
            3: {'coverage_status': 'COVERED', 'financialExposure': 0},
            4: {'final_verdict': 'JUSTIFIED', 'summary': 'Test specialist consensus'},
        }[request_id]
        if on_complete:
            await on_complete(agent_name, result, 0)
        return result, 0

    monkeypatch.setattr(client_agent, '_call_a2a_timed', specialist)
    app = FastAPI()
    app.include_router(extraction.router)
    app.include_router(orchestrator.router)

    async def scenario():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            response = await client.post('/api/orchestrator/runs', json={'patientId': patient_id, 'prescribed_action': initial_action})
            assert response.status_code == 200
            await orchestrator.run_tasks[patient_id]
            previous = initial_dose
            for iteration, dose in enumerate(doses, start=1):
                response = await client.post('/api/extract-comment', json={
                    'comment': f'Reduce {drug} from {previous} mg to {dose} mg {route} {frequency}',
                })
                assert response.status_code == 200
                extracted = response.json()
                assert extracted['is_valid'] is True
                expected = f'{drug} {dose:g} mg {route} {frequency}'
                assert extracted['standardized_action'] == expected
                response = await client.post('/api/orchestrator/resume', json={
                    'patientId': patient_id, 'extraction_details': extracted,
                    'modifications': extracted['modifications'],
                })
                assert response.status_code == 200, response.text
                await orchestrator.run_tasks[patient_id]
                response = await client.get('/api/orchestrator/stream', params={'patientId': patient_id, 'action': expected})
                assert response.status_code == 200
                events = [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
                assert events[-1]['name'] == 'Arbitration Reducer'
                assert events[-1]['status'] == 'completed'
                result = (await client.get(f'/api/hitl/package/{patient_id}')).json()
                assert 'error' not in result
                assert result['prescribed_action'] == expected
                assert result['original_prescribed_action'] == initial_action
                assert result['iteration_count'] == iteration
                assert len(result['report_history']) == 4 * (iteration + 1)
                assert result['patient_profile']['medications'] == [expected]
                safety_input = [p for p in dispatched if p['agent-task'] == 'safety'][-1]
                assert safety_input['patient_data']['medications'] == [expected]
                assert safety_input['recent_action']['route'].lower() == route.lower()
                assert safety_input['recent_action']['frequency'] == frequency
                saved = json.loads(database.read_text())['patients'][0]['patient']
                assert saved['medications'] == [expected]
                assert saved['dosage_instructions']['dose'] == dose
                assert synced[-1]['medications'] == [expected]
                previous = dose

    asyncio.run(scenario())


def test_partial_patient_id_does_not_modify_another_patient(monkeypatch):
    cache = {'P001': {'patient_id': 'P001', 'medications': ['Apixaban 5 mg oral twice daily']}}
    original = copy.deepcopy(cache)
    monkeypatch.setattr(patient_service, '_PATIENTS_CACHE', cache)
    assert patient_service.update_patient_in_cache('P00', prescribed_action='Apixaban 40 mg oral twice daily') is False
    assert cache == original


def test_model_cannot_replace_explicit_target_with_previous_dose(monkeypatch):
    class WrongDoseModel:
        def with_structured_output(self, schema):
            return self

        def invoke(self, prompt):
            return extraction.ExtractedOverride(
                is_valid=True, reasoning='Deliberately incorrect model extraction',
                modifications=[extraction.DosageModification(dosage_name='Apixaban', proposed_dosage=40)],
            )

    monkeypatch.setattr(extraction, '_llm', WrongDoseModel())
    result = asyncio.run(extraction.extract_comment(extraction.CommentRequest(
        comment='Reduce Apixaban from 40 mg to 5 mg oral twice daily',
    )))
    assert result['modifications'][0]['proposed_dosage'] == 5
    assert result['standardized_action'] == 'Apixaban 5 mg oral twice daily'
