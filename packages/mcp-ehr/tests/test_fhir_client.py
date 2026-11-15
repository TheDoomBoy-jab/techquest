"""Regression tests for missing clinical facts, observation codes and fixture lookup."""
import importlib.util
import json
from pathlib import Path

MODULE = Path(__file__).parents[1] / 'src/mcp_ehr/fhir_client.py'
spec = importlib.util.spec_from_file_location('review_fhir_client', MODULE)
fhir = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fhir)


def test_missing_values_are_not_invented():
    patient = fhir._parse_everything_bundle({'entry': []}, 'fixture')
    assert patient['age'] is None
    assert patient['consent_capacity'] is None
    assert patient['pregnancy_test_result'] is None
    assert fhir._compute_age('invalid-date') is None


def test_albumin_is_not_alt():
    bundle={'entry':[{'resource':{'resourceType':'Observation','code':{'coding':[{'system':'http://loinc.org','code':'1751-7'}]},'valueQuantity':{'value':4.2}}}]}
    assert 'ALT' not in fhir._parse_everything_bundle(bundle,'fixture')['lab_results']


def test_alt_observation_uses_correct_code():
    bundle={'entry':[{'resource':{'resourceType':'Observation','code':{'coding':[{'system':'http://loinc.org','code':'1742-6'}]},'valueQuantity':{'value':27}}}]}
    assert fhir._parse_everything_bundle(bundle,'fixture')['lab_results']['ALT'] == 27


def test_all_local_patient_records_are_retrievable_without_http(monkeypatch):
    def disallow_http(*args,**kwargs):
        raise AssertionError('Local fixture lookup should not call the network')
    monkeypatch.setattr(fhir.httpx,'get',disallow_http)
    records=json.loads(fhir._EXPANDED_JSON_PATH.read_text())['patients']
    assert records
    identifiers=[]
    for entry in records:
        patient=entry.get('patient',entry)
        identifier=entry.get('patient_id') or patient.get('internal_id') or patient.get('patient_id')
        assert identifier
        identifiers.append(identifier)
        result=fhir.get_patient(identifier)
        assert result['data_source']=='local_synthetic_fixture'
        assert result['patient_id']==identifier
    assert len(set(identifiers))==len(identifiers)
