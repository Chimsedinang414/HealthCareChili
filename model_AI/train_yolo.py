from ultralytics import YOLO
import os

# Cấu hình
DATASET_PATH = r'D:\Project\HealthCareTree\model_AI\dataset\peppers'
MODEL_NAME = 'yolo11n'  # YOLO11 nano (nhanh nhất)
EPOCHS = 30
IMG_SIZE = 640
BATCH_SIZE = 8
PROJECT_DIR = r'D:\Project\HealthCareTree\model_AI'

def main():
    print("=" * 50)
    print("Training YOLO11 for Plant Disease Detection")
    print("=" * 50)
    
    # Kiểm tra dataset tồn tại
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        return
    
    # Liệt kê các class trong dataset
    classes = [d for d in os.listdir(DATASET_PATH) 
               if os.path.isdir(os.path.join(DATASET_PATH, d))]
    print(f"\nFound {len(classes)} classes: {classes}")
    
    # Tạo file cấu hình YAML cho YOLO
    yaml_content = f"""# YOLO Dataset Configuration
path: {DATASET_PATH}
train: images
val: images

# Classes
names:
  0: bacterial_spot
  1: healthy
  2: leaf_curl_virus
"""
    
    yaml_path = os.path.join(PROJECT_DIR, 'dataset.yaml')
    with open(yaml_path, 'w', encoding='utf-8') as f:
        f.write(yaml_content)
    print(f"Created dataset config: {yaml_path}")
    
    # Load model YOLO11
    print(f"\nLoading {MODEL_NAME} model...")
    model = YOLO(f'{MODEL_NAME}.pt')  # Pretrained weights
    
    # Train model
    print(f"\nStarting training...")
    print(f"  - Epochs: {EPOCHS}")
    print(f"  - Image size: {IMG_SIZE}")
    print(f"  - Batch size: {BATCH_SIZE}")
    print(f"  - Dataset: {DATASET_PATH}")
    
    results = model.train(
        data=yaml_path,
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        project=PROJECT_DIR,
        name='train',
        exist_ok=True,
        verbose=True,
        # Tối ưu hóa
        patience=5,           # Early stopping
        save=True,            # Lưu model checkpoint
        plots=True,           # Tạo biểu đồ training
        val=True,             # Validate sau mỗi epoch
    )
    
    # In kết quả
    print("\n" + "=" * 50)
    print("Training completed!")
    print("=" * 50)
    
    # Tìm model tốt nhất
    best_model_path = os.path.join(PROJECT_DIR, 'train', 'weights', 'best.pt')
    if os.path.exists(best_model_path):
        print(f"\nBest model saved at: {best_model_path}")
        # Đổi tên thành plant_health_model.pt
        final_path = os.path.join(PROJECT_DIR, 'plant_health_model.pt')
        if os.path.exists(final_path):
            os.remove(final_path)
        os.rename(best_model_path, final_path)
        print(f"Model copied to: {final_path}")
    else:
        print(f"\nModel saved at: {PROJECT_DIR}/train/weights/")
    
    # Metrics
    if results:
        print(f"\nFinal metrics:")
        print(f"  - mAP50: {results.box.map50:.4f}")
        print(f"  - mAP50-95: {results.box.map:.4f}")

if __name__ == '__main__':
    main()