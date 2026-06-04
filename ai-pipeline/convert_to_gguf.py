"""
LoRA 어댑터 → GGUF 변환 스크립트
학습은 완료된 상태에서 변환만 다시 실행할 때 사용

실행 (ai-pipeline 디렉토리에서):
  source ~/finetune-env/bin/activate
  cd /mnt/c/Users/예은/OneDrive/문서/GitHub/ai-interview-assistant/ai-pipeline
  python convert_to_gguf.py
"""

from unsloth import FastLanguageModel

MODEL_NAME     = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"
MAX_SEQ_LENGTH = 2048
ADAPTER_DIR    = "lora_adapters"
GGUF_DIR       = "gguf_output"

print("모델 + 어댑터 로드 중...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=ADAPTER_DIR,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)

print("GGUF 변환 시작 (시간 걸릴 수 있음)...")
model.save_pretrained_gguf(GGUF_DIR, tokenizer, quantization_method="q4_k_m")
print(f"완료: {GGUF_DIR}/unsloth.Q4_K_M.gguf")
print("\nOllama 적용: ollama create interview-llama -f Modelfile")
