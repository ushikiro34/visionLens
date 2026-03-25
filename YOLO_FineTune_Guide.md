# [YOLO Fine-Tune 가이드] K-Food Vision Lens
> 버전: 1.1 (2026년 3월 · 데이터 증강 전략 및 도메인 갭 대응 추가)

---

## 1. 개요

- **모델**: Ultralytics YOLOv8-seg (segmentation 타입 — Fill Ratio 기하 계산용)
- **학습 데이터**: AI Hub "한국 이미지(음식)" (dataSetSn=79)
  - 150종 한국 음식 × 약 1,000장 = 총 15만 장
  - 세그먼트 어노테이션 포함 (YOLO-seg 바로 호환 가능)
- **목표**: 한국식 그릇(뚝배기, 식판) + 복합 반찬 인식률 88~93% 달성
- **HITL 연계**: 사용자 보정 데이터(수정된 음식명·그릇) 주기적 추가 fine-tune 반영

---

## 2. 준비 단계 (1시간 이내)

1. AI Hub 접속 → https://aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100&aihubDataSe=data&dataSetSn=79
2. 연구목적 활용동의 신청 (내국인만 가능)
3. 데이터 다운로드 (약 20~30GB)
4. Ultralytics 설치

```bash
pip install ultralytics==8.3.0  # 2026년 기준 안정 버전
pip install rank_bm25            # 하이브리드 검색용
```

---

## 3. 데이터셋 준비 (YOLO 형식 변환)

```python
# dataset_converter.py (한 번만 실행)
from ultralytics.data.converter import convert

convert(
    dir="aihub_korean_food",
    format="yolo-seg",
    output_dir="kfood_yolo_dataset"
)
```

**data.yaml 예시:**
```yaml
path: ./kfood_yolo_dataset
train: images/train
val:   images/val
nc:    150
names: ['김치찌개', '비빔밥', '뚝배기된장찌개', ...]  # class 리스트 직접 작성
```

**클래스 불균형 주의:**
- AI Hub 데이터는 종류별 이미지 수 편차 존재
- 학습 전 클래스별 이미지 수 확인 후 Under-sampling 또는 Oversampling 적용

```python
# 클래스별 이미지 수 확인
from collections import Counter
import os, glob

label_counts = Counter()
for f in glob.glob("kfood_yolo_dataset/labels/train/*.txt"):
    with open(f) as lf:
        for line in lf:
            label_counts[int(line.split()[0])] += 1

print(label_counts.most_common(10))   # 상위 10개
print(label_counts.most_common()[-10:])  # 하위 10개 (부족한 클래스)
```

---

## 4. Fine-Tune 실행 (한국 음식 특화 증강 포함)

```python
from ultralytics import YOLO

model = YOLO("yolov8s-seg.pt")  # s 추천 (속도·정확도 균형)

model.train(
    data="data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    device="0",       # GPU 사용 시
    patience=10,
    name="kfood_yolov8s_seg",

    # 한국 음식 특화 증강 설정
    hsv_h=0.015,      # 색상 변화 (조명 조건 다양화)
    hsv_s=0.5,        # 채도 변화 (국물 색상 다양화)
    hsv_v=0.4,        # 명도 변화 (스테인리스 반사광 대응)
    fliplr=0.0,       # 좌우 반전 OFF (그릇 방향 유지)
    degrees=15,       # 촬영 각도 변화 (±15도)
    scale=0.3,        # 크기 변화 (그릇 크기 다양성)
    mosaic=1.0,       # 모자이크 증강 (복합 반찬 인식 향상)
    copy_paste=0.2,   # Copy-Paste 증강 (반찬 배치 다양화)
)
```

---

## 5. 도메인 갭 대응

> AI Hub 데이터는 연구용 촬영(조명 최적화, 접시 위 배치)이 많음
> 실제 앱 사용은 식당·가정에서 그릇에 담긴 상태로 촬영
> 도메인 갭으로 인한 인식률 저하 가능

**대응 방법:**
1. **실제 환경 데이터 추가 수집**: 앱 베타 테스터의 HITL 보정 이미지 수집 (익명화 후)
2. **증강으로 커버**: 위 증강 설정에서 hsv_v(명도), degrees(각도) 값이 도메인 갭 완화
3. **기준물체 클래스 추가**: 젓가락·숟가락 클래스를 data.yaml에 추가하여 scale factor 검출 향상

---

## 6. Human-in-the-Loop 연계 재학습

```python
# 사용자 보정 데이터로 추가 학습
model = YOLO("runs/detect/kfood_yolov8s_seg/weights/best.pt")
model.train(
    data="updated_data.yaml",  # 보정 데이터 포함 yaml
    epochs=20,
    resume=True
)
```

**재학습 주기**: 6개월 또는 보정 데이터 5,000건 이상 수집 시

---

## 7. 배포 및 ONNX 변환 (모바일/서버)

```bash
yolo export model=best.pt format=onnx opset=12
# → TFLite 또는 ONNX Runtime으로 모바일 온디바이스 추론
# 목표 크기: 15MB 이하 (YOLOv8s-seg 기준)
# Flutter 연동: flutter_tflite 또는 onnxruntime_flutter 패키지 사용
```

---

**작성일**: 2026년 3월
**버전**: 1.1 (한국 음식 특화 증강 설정 · 클래스 불균형 처리 · 도메인 갭 대응 · 기준물체 클래스 추가 가이드 신규 추가)
