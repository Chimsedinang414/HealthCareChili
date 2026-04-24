import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
import os


# Sửa lại đường dẫn chính xác dựa trên cấu trúc thư mục của bạn
DATASET_PATH = r'D:\Project\HealthCareTree\model_AI\dataset\peppers'
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10

# 1. TIỀN XỬ LÝ DỮ LIỆU
# Chuẩn hóa ảnh và chia 20% dữ liệu để kiểm tra độ chính xác (validation)
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    rotation_range=20,
    horizontal_flip=True
)

train_generator = datagen.flow_from_directory(
    DATASET_PATH,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training'
)

val_generator = datagen.flow_from_directory(
    DATASET_PATH,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

# In ra các nhãn để xác nhận (healthy, bacterial_spot)
labels = train_generator.class_indices
print(f"Các nhãn nhận diện được: {labels}")

base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
base_model.trainable = False  # 

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.2), 
    layers.Dense(len(labels), activation='softmax') # Đầu ra khớp với số lượng folder nhãn
])

# 3. HUẤN LUYỆN
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

print("--- BẮT ĐẦU HUẤN LUYỆN ---")
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS
)

# 4. LƯU MÔ HÌNH
model.save('plant_health_model.h5')
print("Thành công! File 'plant_health_model.h5' đã sẵn sàng để bàn giao cho nhóm.")