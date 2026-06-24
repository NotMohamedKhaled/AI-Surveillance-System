"""Export all YOLO .pt models to ONNX format.

Usage:
    python export_onnx.py

This will create .onnx files alongside the original .pt files.
After export, update config.py paths to use the .onnx versions.
"""

from ultralytics import YOLO
import os

MODELS = {
    "Person Detector": r"Trained_Models\yolov8_run\weights\best.pt",
    "Weapon Detector": r"Trained_Models\Weapon\best.pt",
    "Pose Estimator":  "yolov8n-pose.pt",
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

for name, rel_path in MODELS.items():
    full_path = os.path.join(BASE_DIR, rel_path) if not os.path.isabs(rel_path) else rel_path
    print(f"\n{'='*50}")
    print(f"Exporting: {name}")
    print(f"Source:    {full_path}")
    print(f"{'='*50}")

    model = YOLO(full_path)
    export_path = model.export(format="onnx", dynamic=True, simplify=True)
    print(f"✓ Exported: {export_path}")

print("\n✅ All models exported to ONNX successfully!")
print("Update src/config.py to use the new .onnx paths.")
