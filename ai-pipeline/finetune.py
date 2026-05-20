"""
LLaMA 3.1 8B LoRA 파인튜닝 스크립트 (Unsloth)

사전 설치:
  pip install unsloth
  pip install trl transformers datasets accelerate bitsandbytes

실행:
  python finetune.py

완료 후 Ollama 적용:
  ollama create interview-llama -f Modelfile
"""

import json, torch
from datasets import Dataset
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template
from trl import SFTTrainer, TrainingArguments

# ── 설정 ──────────────────────────────────────────────────────────────────
MODEL_NAME     = "unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit"
MAX_SEQ_LENGTH = 2048
OUTPUT_DIR     = "lora_output"
GGUF_DIR       = "gguf_output"

TRAIN_FILE = "data/train.jsonl"
EVAL_FILE  = "data/eval.jsonl"

# ── 모델 로드 ──────────────────────────────────────────────────────────────
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

tokenizer = get_chat_template(tokenizer, chat_template="llama-3.1")

# ── 데이터 로드 ────────────────────────────────────────────────────────────
def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows

def format_batch(examples):
    texts = []
    for messages in examples["messages"]:
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )
        texts.append(text)
    return {"text": texts}

train_ds = Dataset.from_list(load_jsonl(TRAIN_FILE)).map(format_batch, batched=True)
eval_ds  = Dataset.from_list(load_jsonl(EVAL_FILE)).map(format_batch,  batched=True)

print(f"학습 데이터: {len(train_ds)}개 / 검증 데이터: {len(eval_ds)}개")

# ── 학습 ──────────────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_ds,
    eval_dataset=eval_ds,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,   # 유효 배치 크기 = 8
        num_train_epochs=3,
        warmup_steps=20,
        learning_rate=2e-4,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        logging_steps=20,
        eval_strategy="steps",
        eval_steps=100,
        save_strategy="steps",
        save_steps=100,
        save_total_limit=2,
        load_best_model_at_end=True,
        output_dir=OUTPUT_DIR,
        report_to="none",
    ),
)

trainer.train()

# ── 저장 ──────────────────────────────────────────────────────────────────
model.save_pretrained("lora_adapters")
tokenizer.save_pretrained("lora_adapters")
print("LoRA 어댑터 저장 완료: lora_adapters/")

# GGUF 변환 (Ollama용)
model.save_pretrained_gguf(GGUF_DIR, tokenizer, quantization_method="q4_k_m")
print(f"GGUF 변환 완료: {GGUF_DIR}/")
print("\nOllama 적용: ollama create interview-llama -f Modelfile")
