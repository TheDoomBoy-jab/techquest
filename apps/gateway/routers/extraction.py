from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()


class DosageModification(BaseModel):
    dosage_name: str = Field(description="Name of the drug or biological parameter (e.g., 'Aspirin', 'Serum Creatinine')")
    proposed_dosage: float = Field(description="The extracted exact numerical value")
    dosage_unit: str = Field(description="The unit of measurement (e.g., 'mg/day', 'mg/dL')")

class ExtractedOverride(BaseModel):
    is_valid: bool = Field(description="True ONLY if exact numerical dosages/limits can be determined for all requests.")
    reasoning: str = Field(description="Explanation of what was extracted, or specifically what exact numbers are missing.")
    modifications: List[DosageModification] = Field(default_factory=list, description="List of specific parameter modifications extracted.")


_api_key = os.getenv("KADO_API_KEY") or os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(
    model=os.getenv("KADO_MODEL", "kado"),
    api_key=_api_key,
    base_url=os.getenv("KADO_BASE_URL", "https://awesome.kado.so/openai/v1"),
    temperature=0,
    default_headers={"x-bf-vk": _api_key} if _api_key else {},
)
structured_llm = llm.with_structured_output(ExtractedOverride)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a precise clinical extraction agent. Read the clinician's comment.\n"
               "If you can determine the exact numerical dosage or threshold for their requests, set is_valid to true and extract them into the modifications list.\n"
               "If the comment is vague (e.g., 'lower the dose') or missing numbers, set is_valid to false, return an empty list, and state exactly what numerical data is required."),
    ("user", "{clinical_comment}")
])

extraction_chain = prompt | structured_llm

class CommentRequest(BaseModel):
    comment: str

@router.post("/api/extract-comment")
async def extract_comment(request: CommentRequest):
    try:
        # Executes the agent and returns a guaranteed structured dictionary
        result = extraction_chain.invoke({"clinical_comment": request.comment})
        return result.model_dump()
    except Exception as error:
        error_text = str(error).lower()
        if "invalid_api_key" in error_text or "incorrect api key" in error_text:
            raise HTTPException(
                status_code=503,
                detail="Clinical extraction is unavailable because OPENAI_API_KEY is invalid or expired.",
            ) from error
        raise HTTPException(
            status_code=502,
            detail="Clinical extraction failed while contacting the language model.",
        ) from error