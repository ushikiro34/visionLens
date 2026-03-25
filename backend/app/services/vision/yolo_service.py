"""
YOLOv8-seg 비전 서비스
- AI Hub 150종 한국 음식 fine-tune 모델 사용
- 음식 검출 + 세그먼트 마스크 + 기준물체(젓가락/숟가락) scale factor 산출
- 모델 미존재 시 mock 결과 반환 (개발 환경용)
"""
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from app.core.config import get_settings

settings = get_settings()


@dataclass
class DetectedObject:
    food_name: str
    confidence: float
    vessel_type: str            # 그릇 타입 (공기밥/국그릇/뚝배기 등)
    fill_ratio_2d: float        # 2D 픽셀 면적 비율 (0~1)
    segment_mask: Optional[np.ndarray] = field(default=None, repr=False)
    bbox: tuple[int, int, int, int] = (0, 0, 0, 0)  # x1, y1, x2, y2


@dataclass
class ScaleFactor:
    px_per_cm: float            # 픽셀/cm 비율
    reference_object: str       # "젓가락" or "숟가락"
    detected: bool = True


@dataclass
class VisionResult:
    foods: list[DetectedObject]
    scale_factor: Optional[ScaleFactor]
    needs_hitl: bool
    hitl_reason: str = ""
    image_width: int = 0
    image_height: int = 0


class YOLOService:

    REFERENCE_OBJECTS = {
        "젓가락": 23.0,   # cm
        "숟가락": 19.0,   # cm
    }

    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        model_path = Path(settings.YOLO_MODEL_PATH)
        if not model_path.exists():
            # 개발 환경: 모델 없으면 mock 모드
            print(f"[YOLO] 모델 파일 없음: {model_path} → Mock 모드로 실행")
            return

        try:
            from ultralytics import YOLO
            self.model = YOLO(str(model_path))
            print(f"[YOLO] 모델 로드 완료: {model_path}")
        except ImportError:
            print("[YOLO] ultralytics 미설치 → Mock 모드")

    async def analyze(self, image: np.ndarray) -> VisionResult:
        if self.model is None:
            return self._mock_result(image)

        results = self.model(image, verbose=False)[0]
        foods = self._parse_detections(results, image)
        scale = self._extract_scale_factor(results, image)

        needs_hitl, reason = self._check_hitl_trigger(foods, scale)

        return VisionResult(
            foods=foods,
            scale_factor=scale,
            needs_hitl=needs_hitl,
            hitl_reason=reason,
            image_width=image.shape[1],
            image_height=image.shape[0],
        )

    def _parse_detections(self, results, image: np.ndarray) -> list[DetectedObject]:
        foods = []
        h, w = image.shape[:2]
        total_area = h * w

        if results.boxes is None:
            return foods

        for i, box in enumerate(results.boxes):
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            food_name = results.names.get(cls_id, "unknown")

            # 세그먼트 마스크에서 2D fill ratio 계산
            fill_2d = 0.5  # fallback
            mask = None
            if results.masks is not None and i < len(results.masks.data):
                mask = results.masks.data[i].cpu().numpy()
                fill_2d = float(mask.sum()) / total_area

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            vessel_type = self._classify_vessel(food_name, (x2 - x1) * (y2 - y1) / total_area)

            foods.append(DetectedObject(
                food_name=food_name,
                confidence=conf,
                vessel_type=vessel_type,
                fill_ratio_2d=fill_2d,
                segment_mask=mask,
                bbox=(x1, y1, x2, y2),
            ))

        return foods

    def _extract_scale_factor(self, results, image: np.ndarray) -> Optional[ScaleFactor]:
        """기준물체(젓가락/숟가락) 검출 → px/cm scale factor 산출"""
        if results.boxes is None:
            return None

        for box in results.boxes:
            cls_id = int(box.cls[0])
            obj_name = results.names.get(cls_id, "")
            if obj_name in self.REFERENCE_OBJECTS:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                pixel_length = max(x2 - x1, y2 - y1)
                real_cm = self.REFERENCE_OBJECTS[obj_name]
                return ScaleFactor(
                    px_per_cm=pixel_length / real_cm,
                    reference_object=obj_name,
                )
        return None

    def _classify_vessel(self, food_name: str, area_ratio: float) -> str:
        """음식명 + 면적 비율로 그릇 타입 추론 (heuristic)"""
        if "국" in food_name or "찌개" in food_name or "탕" in food_name:
            return "국그릇"
        if "뚝배기" in food_name:
            return "뚝배기"
        if "밥" in food_name:
            return "공기밥"
        if area_ratio > 0.3:
            return "접시"
        return "공기밥"

    def _check_hitl_trigger(
        self,
        foods: list[DetectedObject],
        scale: Optional[ScaleFactor],
    ) -> tuple[bool, str]:
        """HITL 트리거 조건 체크"""
        if not foods:
            return True, "음식 미검출"

        low_conf = [f for f in foods if f.confidence < settings.YOLO_CONFIDENCE_THRESHOLD]
        if low_conf:
            names = ", ".join(f.food_name for f in low_conf)
            return True, f"낮은 confidence ({names}): {low_conf[0].confidence:.2f} < {settings.YOLO_CONFIDENCE_THRESHOLD}"

        if scale is None:
            return True, "기준물체(젓가락/숟가락) 미검출 — 크기 추정 불확실"

        return False, ""

    def _mock_result(self, image: np.ndarray) -> VisionResult:
        """모델 없는 개발 환경용 mock"""
        return VisionResult(
            foods=[
                DetectedObject(
                    food_name="김치찌개",
                    confidence=0.91,
                    vessel_type="뚝배기",
                    fill_ratio_2d=0.70,
                )
            ],
            scale_factor=ScaleFactor(px_per_cm=12.5, reference_object="젓가락"),
            needs_hitl=False,
            image_width=640,
            image_height=480,
        )
