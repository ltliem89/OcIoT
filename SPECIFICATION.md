# WEB DEVELOPMENT SPECIFICATION
# HỆ SINH THÁI TUẦN HOÀN THÔNG MINH

Version: 1.0
Status: Development
Language: Vietnamese
Platform: Web
Framework: Next.js + TypeScript
Deployment: Vercel
Repository: GitHub
Development Assistant: Google AI Studio

---

# 1. MỤC TIÊU

Xây dựng Web Dashboard hiện đại để giám sát và điều khiển hệ sinh thái tuần hoàn thông minh.

Thành phần:
- ESP32-S3
- TDS sensor
- Soil Moisture sensor
- 2 float sensors
- 2 relays/pumps
- Buzzer
- AI Vision PC
- Google Sheets

Web phải hoạt động tốt trên máy tính, tablet và điện thoại.

# 2. KIẾN TRÚC

```text
                    WEB
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
    ESP32-S3     Google Sheets   AI Vision PC
       |                           |
       |                           |
       +----------- Camera --------+
```

AI Vision PC và ESP32-S3 là các chương trình riêng.

# 3. VAI TRÒ WEB

Web chịu trách nhiệm:
1. Dashboard
2. Hiển thị dữ liệu ESP32-S3
3. Hiển thị trạng thái thiết bị
4. Điều khiển pump
5. Điều khiển buzzer
6. Biểu đồ
7. Lịch sử
8. Nhập Google Sheets URL
9. Đọc dữ liệu Google Sheets
10. Hiển thị AI Vision
11. Cảnh báo
12. Phân tích
13. Responsive mobile
14. Demo Mode

Web không trực tiếp điều khiển GPIO.

# 4. CÔNG NGHỆ

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React
- Recharts
- Vercel
- GitHub

# 5. RESPONSIVE

Mobile First.

```text
Mobile  < 640px
Tablet  640-1024px
Desktop > 1024px
```

Trên mobile:
- icon lớn
- card gọn
- ưu tiên thông tin quan trọng
- bottom navigation
- không dùng sidebar cố định

# 6. DASHBOARD

Hiển thị:
- ESP32 Online/Offline
- Device ID
- Last update
- WiFi RSSI
- TDS
- Float LOW
- Float HIGH
- Water status
- Soil moisture
- Pump 1
- Pump 2
- Buzzer
- Mode
- Bèo coverage
- Egg clusters
- Hatching status

# 7. CONTROL

```text
Pump 1  ON/OFF
Pump 2  ON/OFF
Buzzer  ON/OFF

Mode:
MANUAL
AUTO
```

AI không được tự ý bật relay.

# 8. REALTIME

Khi dữ liệu mới đến:
- cập nhật card
- cập nhật trạng thái
- cập nhật chart
- cập nhật last update

Nếu quá timeout:
`ESP32 OFFLINE`

# 9. DATA

Bảng lịch sử:
- timestamp
- TDS
- moisture
- float_low
- float_high
- pump1
- pump2
- buzzer

Filter:
- 1 hour
- 6 hours
- 24 hours
- 7 days
- 30 days

# 10. CHART

Biểu đồ:
1. TDS
2. Soil Moisture
3. Water Status
4. Pump activity

Có:
- tooltip
- min
- max
- average
- trend

# 11. GOOGLE SHEETS

Giao diện:

```text
Google Sheets

[ Paste Google Sheets URL ]

[ CONNECT ]
```

Sau khi kết nối hiển thị:
- Connected
- Rows
- Last update

Web phải tự lấy Spreadsheet ID từ URL.

Header đề xuất:

```text
timestamp
tds
soil_moisture
float_low
float_high
pump1
pump2
buzzer
```

Xử lý:
- missing data
- invalid number
- invalid timestamp
- empty cells
- malformed URL

# 12. CAMERA / AI VISION

Trang Camera:

```text
CAMERA AI

[ camera ]

[ CAPTURE ]
[ ANALYZE ]
```

Hiển thị:
- ảnh hiện tại
- kết quả AI
- confidence

Ví dụ:

```text
Bèo
Detected: YES
Coverage: 76%
Status: NORMAL
Confidence: 89%

Trứng ốc
Detected: YES
Egg clusters: 5
Hatching: POSSIBLE
Confidence: 84%
```

Các giá trị do AI Vision PC cung cấp.

# 13. AI ANALYSIS

Nút:
`PHÂN TÍCH HỆ SINH THÁI`

Có thể dùng:
- ESP32 data
- Google Sheets
- Vision result

Kết quả:
- trend
- anomaly
- summary
- recommendation

AI không được tự điều khiển thiết bị.

# 14. ALERT

Cảnh báo:
- ESP32 offline
- TDS vượt ngưỡng
- water low
- water abnormal
- moisture abnormal
- camera unavailable
- AI Vision error

# 15. SETTINGS

Cho phép cấu hình:
- Device ID
- sensor thresholds
- offline timeout
- Google Sheet URL
- auto rules
- camera settings
- AI settings

# 16. DEMO MODE

Bắt buộc có.

Tạo dữ liệu giả:
- TDS
- moisture
- water level
- pump
- buzzer
- AI Vision

Có nút:
`LIVE / DEMO`

# 17. API CONTRACT

```text
POST /api/iot/data
GET  /api/iot/status
GET  /api/iot/command
POST /api/iot/command

GET  /api/sheets
POST /api/ai/analyze
POST /api/ai/vision
GET  /api/vision/status
```

Contract phải thống nhất với 02_ESP32S3.md và 03_AI_VISION_PC.md.

# 18. TYPE

```ts
interface SensorData {
  device_id: string
  timestamp: string
  tds: number | null
  soil_moisture: number | null
  float_low: boolean
  float_high: boolean
  pump1: boolean
  pump2: boolean
  buzzer: boolean
}
```

# 19. CODE STRUCTURE

```text
app/
components/
lib/
hooks/
types/
public/
```

Không viết toàn bộ Web trong page.tsx.

# 20. SECURITY

MVP cuộc thi, không xây authentication phức tạp nếu chưa cần.

Không để secret API key trong frontend.

Secret dùng environment variables trên Vercel.

# 21. PERFORMANCE

Ưu tiên:
- load nhanh
- mobile mượt
- chart nhẹ
- không reload toàn trang
- polling hợp lý

# 22. DEFINITION OF DONE

[x] Desktop responsive
[x] Mobile responsive
[x] Dashboard
[x] Sensor cards
[x] Realtime data
[x] Control
[x] Charts
[x] History
[x] Google Sheets URL
[x] Google Sheets data
[x] Camera page
[x] AI Vision result
[x] AI analysis
[x] Alert
[x] Demo Mode
[x] Deploy Vercel
[x] GitHub repository
