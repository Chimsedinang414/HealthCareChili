import tensorflow as tf
import numpy as np
import cv2


try:
    model = tf.keras.models.load_model('plant_health_model.h5')
    print("--- Đã tải mô hình thành công! ---")
except:
    print("Lỗi: Không tìm thấy file plant_health_model.h5. Hãy hoàn tất train_ai.py trước!")
    exit()


class_names = ['bacterial_spot', 'healthy'] 
display_name = {'bacterial_spot': 'Benh vi khuan', 'healthy': 'Khoe manh'}
# 3. Khởi tạo Webcam
cap = cv2.VideoCapture(0)

print("Đang mở Webcam... Nhấn 'q' để thoát.")

while True:
    # Đọc khung hình từ Webcam
    ret, frame = cap.read()
    if not ret:
        break

    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    # Resize về 224x224 (Chuẩn MobileNet) [cite: 1112, 1612]
    img_resized = cv2.resize(img_rgb, (224, 224))
    # Chuẩn hóa giá trị pixel về [0, 1] và thêm chiều batch
    img_array = np.expand_dims(img_resized, axis=0) / 255.0

    # 5. Sử dụng mô hình để dự đoán (Inference) [cite: 1442, 1457]
    prediction = model.predict(img_array, verbose=0)
    index = np.argmax(prediction)
    confidence = prediction[0][index] * 100

    # 6. Hiển thị kết quả lên màn hình Webcam
    label = f"{display_name.get(class_names[index], class_names[index])}: {confidence:.2f}%"
    color = (0, 255, 0) if class_names[index] == 'healthy' else (0, 0, 255) # Xanh cho khỏe, Đỏ cho bệnh
    
    cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)q
    cv2.imshow("Kiem tra suc khoe cay (AI Specialist Test)", frame)

    # Thoát nếu nhấn phím 'q' [cite: 1257]
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Giải phóng tài nguyên
cap.release()
cv2.destroyAllWindows()