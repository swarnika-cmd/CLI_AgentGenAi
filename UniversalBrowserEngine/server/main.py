import os
import json
from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel
from typing import Any, Dict, List
from normalize import normalize_to_component_tree

app = FastAPI(title="Universal Browser Engine Ingestion Server")

class IngestPayload(BaseModel):
    url: str
    title: str
    viewport: Dict[str, Any]
    screenshot_base64: str
    dom: Dict[str, Any]
    styles: Dict[str, Any]
    layout: Dict[str, Any]
    accessibility_tree: List[Dict[str, Any]]
    fonts: List[Any]
    framework_hints: Dict[str, Any]
    network: Dict[str, Any]

def get_prompt(tree: List[Dict[str, Any]], css_variables: Dict[str, Any]) -> str:
    """Loads the prompt template and injects the dynamic payload."""
    template_path = os.path.join(os.path.dirname(__file__), "prompt_template.txt")
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()
    
    # In a real scenario, we might truncate the tree if it exceeds context limits
    tree_json = json.dumps(tree, indent=2)
    css_json = json.dumps({"css_variables": css_variables}, indent=2)
    
    prompt = template.replace("{css_variables_json}", css_json)
    prompt = prompt.replace("{component_tree_json}", tree_json)
    return prompt

@app.post("/ingest")
async def ingest(payload: IngestPayload):
    print(f"Received payload from: {payload.url}")
    print(f"Viewport: {payload.viewport}")
    
    # 1. Normalize the raw DOM/CSS/A11y data into a clean Universal UI Tree
    raw_dict = payload.model_dump()
    tree = normalize_to_component_tree(raw_dict)
    print(f"Extracted {len(tree)} active components from the DOM.")
    
    # 2. Extract CSS Variables
    css_vars = payload.styles.get("css_variables", {})
    
    # 3. Generate the VLM Prompt
    prompt = get_prompt(tree, css_vars)
    
    # 4. (Placeholder for VLM call)
    # In a full implementation, you would pass `prompt` and `payload.screenshot_base64` 
    # to Gemini 1.5 Pro or GPT-4o here.
    # response = vlm_client.generate(prompt=prompt, image=payload.screenshot_base64)
    # with open("output/index.html", "w") as f:
    #     f.write(response.text)
    
    # For testing, we just write the prompt and tree to disk to verify the pipeline
    os.makedirs("output", exist_ok=True)
    with open("output/latest_prompt.txt", "w", encoding="utf-8") as f:
        f.write(prompt)
    with open("output/latest_tree.json", "w", encoding="utf-8") as f:
        json.dump(tree, f, indent=2)
        
    return {
        "status": "success", 
        "message": "Payload ingested and normalized",
        "nodes_processed": len(tree)
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
