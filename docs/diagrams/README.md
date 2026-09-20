# Diagram Workflow

PlantUML là source format mặc định cho system architecture, component/request flow và sequence diagram.

Không tạo diagram trước khi `docs/SOLUTION_SCOPE.md` và contract liên quan đủ rõ. User journey, UI mockup và evaluation chart nên dùng công cụ phù hợp khác.

## Files

```text
docs/diagrams/
├── system-architecture.puml
├── system-architecture.svg
├── ai-request-sequence.puml
├── ai-request-sequence.svg
└── README.md
```

Chỉ tạo file thực sự cần. `.puml` là source of truth; `.svg` là bản dùng trong deck/docs.

## Naming

- `system-architecture`: deployed components và trust/data boundaries.
- `ai-request-sequence`: thứ tự client, Express, FastAPI, provider và response validation.
- `data-lifecycle`: dữ liệu nào được gửi, lưu, xóa hoặc không lưu.
- `failure-flow`: chỉ dùng nếu fallback/error behavior khó giải thích bằng sequence chính.

Không tạo nhiều diagram mô tả cùng một quan hệ.

## Required source header

Mỗi `.puml` bắt đầu bằng comment:

```plantuml
' Status: implemented | mixed | planned
' Owner: Bảo Anh | Hồng Phúc | Team
' Verified against: contracts/code/config paths
' Last reviewed: YYYY-MM-DD HH:MM
```

Nếu diagram trộn implemented và planned components, planned component phải có label hoặc stereotype `<<planned>>` rõ ràng.

## Minimal style baseline

```plantuml
@startuml
left to right direction
skinparam backgroundColor transparent
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 18
skinparam ArrowColor #002060
skinparam componentBorderColor #002060
skinparam componentBackgroundColor #F7F9FC

' Add only verified components and flows here.

@enduml
```

Label dùng English, ngắn và dễ hiểu với judges. Diagram cho slide nên giữ khoảng 6–8 node chính.

## Render

Nếu máy đã có PlantUML CLI:

```bash
plantuml -tsvg docs/diagrams/<diagram-name>.puml
```

Hoặc dùng PlantUML extension trong VS Code và export SVG. Không commit local preview cache hoặc generated PNG nếu deck chỉ dùng SVG.

## Verification gate

Trước khi dùng SVG trong appendix:

- `.puml` render không lỗi;
- SVG được mở và kiểm tra trực quan;
- component và direction khớp code/contracts/deployment;
- public/internal boundary rõ;
- secret, private URL và raw payload không xuất hiện;
- planned item được đánh dấu;
- text còn đọc được khi đặt vào slide 16:9;
- owner kỹ thuật đã kiểm tra accuracy;
- deck owner đã kiểm tra contrast và layout.
