"""
LoRA 어댑터 → GGUF 변환 스크립트
학습 완료 후 GGUF 변환만 따로 실행할 때 사용

실행:
  python convert_gguf.py
"""

import torch
from unsloth import FastLanguageModel

MODEL_NAME     = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"
MAX_SEQ_LENGTH = 1024
LORA_DIR       = "lora_adapters"
GGUF_DIR       = "gguf_output"

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=LORA_DIR,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)

print("GGUF 변환 중...")
model.save_pretrained_gguf(GGUF_DIR, tokenizer, quantization_method="q4_k_m")
print(f"GGUF 변환 완료: {GGUF_DIR}/")
print("\nOllama 적용: ollama create interview-llama -f Modelfile")
