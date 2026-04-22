#!/bin/bash
# MLX LM 서버 시작 스크립트
MODEL="mlx-community/Meta-Llama-3.1-8B-Instruct-4bit"
PORT=8080

echo "MLX LM 서버 시작 중..."
echo "모델: $MODEL"
echo "포트: $PORT"

python3 /Users/sangyeop/Library/Python/3.9/bin/mlx_lm.server \
  --model "$MODEL" \
  --port "$PORT" \
  --host 127.0.0.1
