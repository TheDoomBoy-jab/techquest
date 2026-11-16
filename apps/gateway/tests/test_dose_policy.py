import asyncio
import copy

import pytest

from routers import extraction, orchestrator
from services import client_agent, patient_service, supabase_reports
from services.dose_policy import DosePolicyError, check_dose_policy


@pytest.mark.parametrize('quantity', ['10 mg', '10000 mg', '100000 mg', '9999 mg', '10001 mg', '10 g', '10000000 mcg', '10,000 mg'])
def test_arbitrary_excessive_quantities_are_rejected(quantity):
    assert check_dose_policy(f'Apixaban {quantity} oral twice daily')['status'] == 'EXCEEDS_LIMIT'


@pytest.mark.parametrize('action,status', [
    ('Apixaban 5 mg oral twice daily', 'WITHIN_LIMIT'),
    ('Apixaban .005 g oral BID', 'WITHIN_LIMIT'),
    ('Apixaban 5000 mcg oral twice daily', 'WITHIN_LIMIT'),
    ('Apixaban 0 mg oral twice daily', 'UNVERIFIED'),
    ('Apixaban -5 mg oral twice daily', 'UNVERIFIED'),
    ('Apixaban NaN mg oral twice daily', 'UNVERIFIED'),
    ('Apixaban 1e4 mg oral twice daily', 'UNVERIFIED'),
    ('Unknown 5 mg oral twice daily', 'UNVERIFIED'),
    ('Apixaban 5 mL oral twice daily', 'UNVERIFIED'),
    ('Apixaban 5 mg IV twice daily', 'UNVERIFIED'),
    ('Apixaban 5 mg oral once daily', 'UNVERIFIED'),
    ('Apixaban 1 mg oral twice daily', 'UNVERIFIED'),
    ('Empagliflozin 25 mg oral daily', 'WITHIN_LIMIT'),
    ('Empagliflozin 25000 mg oral daily', 'EXCEEDS_LIMIT'),
    ('Pioglitazone 45 mg oral daily', 'WITHIN_LIMIT'),
    ('Pioglitazone 46 mg oral daily', 'EXCEEDS_LIMIT'),
    ('Pembrolizumab 200 mg IV every 3 weeks', 'WITHIN_LIMIT'),
    ('Pembrolizumab 100 mg IV every 3 weeks', 'UNVERIFIED'),
    ('Pembrolizumab 400 mg IV every 3 weeks', 'EXCEEDS_LIMIT'),
    ('Pembrolizumab 400 mg IV every 6 weeks', 'WITHIN_LIMIT'),
])
def test_units_regimens_and_unknown_values(action, status):
    assert check_dose_policy(action)['status'] == status


def test_exact_reported_notes_are_not_validated():
    for dose in (10000, 100000):
        data = extraction._fallback_extract(f'Titrate Apixaban to {dose} mg oral twice daily per protocol Arm A')
        assert data['is_valid'] is False
        assert data['is_appropriate'] is False
        assert data['dose_policy_result']['status'] == 'EXCEEDS_LIMIT'


@pytest.mark.parametrize('endpoint', ['fhir', 'resume', 'accept'])
def test_excessive_order_never_reaches_persistence(monkeypatch, endpoint):
    previous = {'rag_output': {}, 'result': {'prescribed_action': 'Apixaban 5 mg oral twice daily'}}
    monkeypatch.setattr(orchestrator, 'runs', {'P010': copy.deepcopy(previous)})
    monkeypatch.setattr(orchestrator, 'hitl_packages', {'P010': {'prescribed_action': 'Apixaban 10000 mg oral twice daily'}})
    monkeypatch.setattr(orchestrator, 'run_tasks', {})
    monkeypatch.setattr(orchestrator, 'update_patient_in_cache', lambda **kw: pytest.fail('Blocked order reached persistence'))
    monkeypatch.setattr(orchestrator, 'append_final_report', lambda *args: pytest.fail('Blocked order was accepted'))
    payload = {'patientId': 'P010', 'confirmed': True, 'standardized_action': 'Apixaban 10000 mg oral twice daily',
               'standardized_drug': 'Apixaban', 'dosage': 10000, 'dosage_unit': 'mg', 'route': 'oral', 'frequency': 'twice daily',
               'modifications': [{'dosage_name': 'Apixaban', 'proposed_dosage': 10000, 'dosage_unit': 'mg', 'route': 'oral', 'frequency': 'twice daily'}]}
    if endpoint == 'fhir':
        call = orchestrator.fhir_update_patient(payload)
    elif endpoint == 'resume':
        call = orchestrator.resume_orchestrator(payload)
    else:
        call = orchestrator.checkpoint_orchestrator({**payload, 'decision': 'accept'})
    with pytest.raises(orchestrator.HTTPException) as error:
        asyncio.run(call)
    assert error.value.status_code == 422
    assert orchestrator.runs['P010'] == previous
    assert orchestrator.run_tasks == {}


def test_storage_layer_cannot_bypass_the_boundary(monkeypatch):
    monkeypatch.setattr(supabase_reports, '_config', lambda: pytest.fail('Unsafe storage request checked database configuration'))
    with pytest.raises(DosePolicyError):
        supabase_reports.sync_patient_data_to_supabase('P010', {'prescribed_action': 'Apixaban 10000 mg oral twice daily'})


def run_input(patient_id, action):
    return {'trial_id': 'NCT00781573', 'prescribed_action': action, 'rule_analysis_package': {'patient': {
        'patient_id': patient_id, 'age': 50, 'sex': 'female', 'medications': [],
        'lab_results': {'creatinine_clearance': {'value': 70}}, 'protocol_facts': {},
    }}}


@pytest.mark.parametrize('patient_id', ['P001', 'P010', 'P032', 'P051', 'ARBITRARY'])
@pytest.mark.parametrize('quantity', ['10000 mg', '100000 mg', '10 g'])
def test_optimistic_models_and_patient_ids_cannot_approve_an_overdose(monkeypatch, patient_id, quantity):
    monkeypatch.setattr(client_agent, 'record_trace', lambda *args, **kwargs: None)
    async def optimistic(payload, request_id, **kwargs):
        return {1: {'compliance_status': 'COMPLIANT', 'violations': []},
                2: {'safety_status': 'SAFE', 'concerns': []},
                3: {'coverage_status': 'COVERED'},
                4: {'final_verdict': 'JUSTIFIED', 'summary': 'Optimistic test model'}}[request_id], 0
    monkeypatch.setattr(client_agent, '_call_a2a_timed', optimistic)
    result = asyncio.run(client_agent.run(run_input(patient_id, f'Apixaban {quantity} oral twice daily')))
    assert result['final_verdict'] == 'NOT_JUSTIFIED'
    assert result['needs_human_review'] is True
    assert result['protocol_compliance_result']['compliance_status'] == 'NON_COMPLIANT'
    assert result['safety_result']['safety_status'] == 'UNSAFE'
    assert result['report_history'][-1]['verdict'] == 'NOT_JUSTIFIED'


def test_unavailable_specialists_do_not_produce_a_default_approval(monkeypatch):
    monkeypatch.setattr(client_agent, 'record_trace', lambda *args, **kwargs: None)
    async def unavailable(*args, **kwargs):
        return RuntimeError('Test specialist unavailable'), 0
    monkeypatch.setattr(client_agent, '_call_a2a_timed', unavailable)
    result = asyncio.run(client_agent.run(run_input('P010', 'Apixaban 5 mg oral twice daily')))
    assert result['final_verdict'] == 'NEEDS_REVIEW'
    assert result['needs_human_review'] is True


def test_unverified_regimen_is_review_required_without_inventing_toxicity(monkeypatch):
    monkeypatch.setattr(client_agent, 'record_trace', lambda *args, **kwargs: None)
    async def optimistic(payload, request_id, **kwargs):
        return {1: {'compliance_status': 'COMPLIANT'}, 2: {'safety_status': 'SAFE'},
                3: {'coverage_status': 'COVERED'}, 4: {'final_verdict': 'JUSTIFIED', 'summary': 'Test model'}}[request_id], 0
    monkeypatch.setattr(client_agent, '_call_a2a_timed', optimistic)
    result = asyncio.run(client_agent.run(run_input('P010', 'Unknown 5 mg oral twice daily')))
    assert result['final_verdict'] == 'NEEDS_REVIEW'
    assert result['safety_result']['safety_status'] == 'NEEDS_REVIEW'
    assert result['rag_rule_result']['status'] == 'UNKNOWN'
