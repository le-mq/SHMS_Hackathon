================================================================================
  SEAL HACKATHON MANAGEMENT SYSTEM (S-HMS)
  Tài liệu hướng dẫn cài đặt và khởi chạy hệ thống
  Phiên bản: 1.0  |  Ngày cập nhật: 06/2026
================================================================================


--------------------------------------------------------------------------------
MỤC LỤC
--------------------------------------------------------------------------------
  1. Giới thiệu chung
  2. Yêu cầu môi trường (Prerequisites)
  3. Cấu trúc thư mục dự án
  4. Hướng dẫn cấu hình cơ sở dữ liệu (Backend Configuration)
  5. Các bước khởi chạy hệ thống (Running the Application)
  6. Tài khoản truy cập mẫu (Demo Accounts)
  7. Thông tin bổ sung (Additional Info)


================================================================================
1. GIỚI THIỆU CHUNG
================================================================================

  Tên hệ thống  : SEAL Hackathon Management System (S-HMS)
  Mô tả         : Nền tảng quản lý toàn bộ vòng đời cuộc thi Hackathon,
                  bao gồm quản lý đội thi, vòng thi, chấm điểm, xếp hạng
                  và công bố kết quả cho nhiều trường đại học.

  * Công nghệ Backend:
    - Ngôn ngữ   : Java 21
    - Framework  : Spring Boot 3.x
    - Build tool : Apache Maven (sử dụng Maven Wrapper đi kèm)
    - Database   : Microsoft SQL Server
    - Migration  : Flyway (tự động khởi tạo schema khi chạy lần đầu)
    - API Docs   : Swagger UI (http://localhost:8080/swagger-ui.html)

  * Công nghệ Frontend:
    - Framework  : ReactJS 19 + Vite
    - Routing    : React Router DOM 7
    - Chart      : Chart.js / react-chartjs-2
    - Package mgr: npm


================================================================================
2. YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)
================================================================================

  Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt đầy đủ các
  công cụ sau:

  1. JDK 21 (hoặc mới hơn)
     - Tải về tại: https://adoptium.net/ hoặc https://jdk.java.net/
     - Kiểm tra: mở Terminal và gõ  -->  java -version
     - Yêu cầu: kết quả phải hiển thị "version 21" trở lên.

  2. Apache Maven 3.9+ (tuỳ chọn - nếu không có, dùng ./mvnw đi kèm)
     - Tải về tại: https://maven.apache.org/download.cgi
     - Kiểm tra: gõ  -->  mvn -version

  3. Node.js (phiên bản LTS mới nhất khuyến nghị) & npm
     - Tải về tại: https://nodejs.org/
     - Kiểm tra: gõ  -->  node -v   và   npm -v

  4. Microsoft SQL Server (Express hoặc Developer Edition)
     - Tải về tại: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
     - Đảm bảo SQL Server đang chạy và có thể kết nối từ localhost:1433
     - Khuyến nghị dùng SQL Server Management Studio (SSMS) để quản lý.


================================================================================
3. CẤU TRÚC THƯ MỤC DỰ ÁN
================================================================================

  SHMS_Hackathon_demo/          <-- Thư mục gốc (Monorepo)
  |
  |-- BE/                       <-- Backend (Spring Boot + Maven)
  |   |-- src/
  |   |   |-- main/
  |   |       |-- java/         <-- Source code Java
  |   |       |-- resources/
  |   |           |-- application.yaml        <-- File cấu hình chính (*)
  |   |           |-- db/migration/           <-- Flyway SQL scripts
  |   |               |-- V1__init_schema.sql <-- Script khởi tạo 31 bảng
  |   |-- pom.xml               <-- Khai báo dependencies Maven
  |   |-- mvnw / mvnw.cmd       <-- Maven Wrapper (không cần cài Maven riêng)
  |
  |-- FE/                       <-- Frontend (ReactJS + Vite)
  |   |-- src/                  <-- Source code React
  |   |-- public/               <-- Tài nguyên tĩnh
  |   |-- package.json          <-- Khai báo dependencies npm
  |   |-- vite.config.js        <-- Cấu hình Vite
  |
  |-- database-generation-context.md  <-- Thiết kế cơ sở dữ liệu (31 bảng)
  |-- README.txt                      <-- File này


================================================================================
4. HƯỚNG DẪN CẤU HÌNH CƠ SỞ DỮ LIỆU (BACKEND CONFIGURATION)
================================================================================

  BƯỚC 4.1 — Tạo Database trống trên SQL Server
  -----------------------------------------------
  Mở SQL Server Management Studio (SSMS) hoặc bất kỳ công cụ nào, kết nối
  vào SQL Server instance của bạn và chạy lệnh sau:

      CREATE DATABASE SHMS_Hackathon;
      GO

  Lưu ý: Tên database mặc định trong cấu hình là "SHMS_Hackathon".
  Bạn có thể đặt tên khác nhưng phải cập nhật lại file cấu hình ở Bước 4.2.


  BƯỚC 4.2 — Chỉnh sửa file cấu hình Backend
  --------------------------------------------
  Mở file:  BE/src/main/resources/application.yaml

  Tìm và sửa đoạn cấu hình datasource cho phù hợp với máy của bạn:

      spring:
        datasource:
          url: jdbc:sqlserver://localhost:1433;databaseName=SHMS_Hackathon;encrypt=false;trustServerCertificate=true
          username: sa
          password: 'YourStrong!Passw0rd'

  Trong đó:
    * url      : Thay "localhost:1433" nếu SQL Server của bạn chạy trên cổng
                 hoặc host khác. Thay "SHMS_Hackathon" nếu bạn đặt tên DB khác.
    * username : Tên đăng nhập SQL Server của bạn (thường là "sa").
    * password : Mật khẩu SQL Server của bạn. Bọc trong dấu nháy đơn nếu
                 mật khẩu có chứa ký tự đặc biệt như "!".

  [!] QUAN TRỌNG — Về Flyway (Database Migration):
      Hệ thống sử dụng Flyway để quản lý schema. Khi bạn khởi chạy Backend
      lần đầu tiên với database còn trống, Flyway sẽ TỰ ĐỘNG thực thi file
      script SQL tại:

          BE/src/main/resources/db/migration/V1__init_schema.sql

      Script này sẽ khởi tạo toàn bộ 31 bảng dữ liệu của hệ thống.
      Bạn KHÔNG cần chạy SQL thủ công.


================================================================================
5. CÁC BƯỚC KHỞI CHẠY HỆ THỐNG (RUNNING THE APPLICATION)
================================================================================

  [!] Hãy đảm bảo SQL Server đang chạy và bạn đã hoàn thành Mục 4 trước khi
      tiếp tục.

  ---
  BƯỚC 1 — Khởi chạy Backend (Spring Boot)
  ---

  Mở Terminal (Command Prompt / PowerShell / Terminal) tại thư mục GỐC của
  dự án (SHMS_Hackathon_demo/), sau đó chạy lệnh:

      cd BE

  Chạy Backend bằng Maven Wrapper (không cần cài Maven trước):

      * Trên macOS / Linux:
          ./mvnw spring-boot:run

      * Trên Windows (Command Prompt hoặc PowerShell):
          mvnw.cmd spring-boot:run

      * Nếu đã cài Maven toàn cục:
          mvn spring-boot:run

  Chờ đến khi Terminal hiển thị dòng tương tự:
      "Started ShmsHackathonApplication in X.XXX seconds"

  Backend đang chạy tại:
      http://localhost:8080

  Swagger UI (tài liệu API tương tác):
      http://localhost:8080/swagger-ui.html

  ---
  BƯỚC 2 — Khởi chạy Frontend (ReactJS + Vite)
  ---

  Mở MỘT TERMINAL MỚI (giữ nguyên Terminal chạy Backend ở trên).
  Di chuyển vào thư mục gốc dự án, sau đó chạy các lệnh:

      cd FE

  Cài đặt các thư viện npm (chỉ cần chạy một lần hoặc khi có thay đổi
  package.json):

      npm install

  Khởi chạy môi trường phát triển (Dev Server):

      npm run dev

  Vite sẽ khởi chạy và hiển thị địa chỉ truy cập, thường là:
      http://localhost:5173

  Mở trình duyệt (Chrome, Edge, Firefox...) và truy cập địa chỉ trên để
  sử dụng hệ thống.

  ---
  TÓM TẮT CỔNG DỊCH VỤ
  ---
    * Backend API    : http://localhost:8080
    * Swagger UI     : http://localhost:8080/swagger-ui.html
    * Frontend (Web) : http://localhost:5173


================================================================================
6. TÀI KHOẢN TRUY CẬP MẪU (DEMO ACCOUNTS)
================================================================================

  Các tài khoản sau đây được tạo sẵn bởi Flyway (data seed migration) để
  bạn có thể đăng nhập và trải nghiệm hệ thống ngay lập tức.

  Lưu ý: Nếu script seed chưa được chạy, hãy tạo tài khoản qua API
  Swagger UI hoặc nhờ người quản trị hệ thống.

  --------------------------------------------------------
  Vai trò       | Email (Username)          | Mật khẩu
  --------------------------------------------------------
  Administrator | admin@shms.edu.vn         | Admin@123
  Coordinator   | coordinator@shms.edu.vn   | Coord@123
  Judge         | judge@shms.edu.vn         | Judge@123
  Mentor        | mentor@shms.edu.vn        | Mentor@123
  Student       | student@fpt.edu.vn        | Student@123
  --------------------------------------------------------

  * Tài khoản "Administrator" có toàn quyền quản trị hệ thống.
  * Tài khoản "Coordinator" quản lý cuộc thi, vòng thi, thông báo.
  * Tài khoản "Judge" thực hiện chấm điểm và công bố kết quả.
  * Tài khoản "Mentor" theo dõi và hỗ trợ các đội thi.
  * Tài khoản "Student" đăng ký, tham gia và nộp bài dự thi.


================================================================================
8. HƯỚNG DẪN TEST THỬ (TESTING GUIDE)
================================================================================

  Sau khi khởi chạy thành công cả Backend và Frontend, bạn có thể kiểm thử
  theo kịch bản sau:

  1. Kiểm tra trang chủ (Public View):
     - Mở http://localhost:5173
     - Bạn sẽ thấy danh sách các Cuộc thi (Contests) đang Active.
     - Bấm "Details" để xem danh sách các hạng mục (Categories) và dòng
       thời gian của vòng thi (Rounds).
  
  2. Đăng nhập với vai trò Quản trị viên (Admin):
     - Truy cập góc phải trên cùng, nhấn "Login".
     - Nhập Email: admin@shms.edu.vn | Pass: Admin@123
     - Sau khi đăng nhập thành công, bạn sẽ vào Dashboard của Admin để
       cấu hình hệ thống (tạo Role, gán quyền).

  3. Đăng nhập với vai trò Sinh viên (Student):
     - Dùng tài khoản student@fpt.edu.vn | Pass: Student@123
     - Kiểm tra chức năng Đăng ký tham gia (Team Registration), xem thông
       báo (Announcements) và sửa Hồ sơ (Profile).
     - Trong trang Profile, bạn có thể thử tính năng "Verify Email".

================================================================================
9. HƯỚNG DẪN ĐÓNG GÓI/NÉN FILE (ZIPPING FOR SHARING)
================================================================================

  Để gửi toàn bộ source code này cho người khác mà file ZIP không bị quá
  nặng (thường do chứa các file thư viện rác/build), bạn HÃY XOÁ các
  thư mục sau TRƯỚC KHI nén file:

  1. Thư mục "BE/target/"
     (Đây là thư mục chứa các file .class và file .jar sau khi Maven build)

  2. Thư mục "FE/node_modules/"
     (RẤT NẶNG - chứa toàn bộ thư viện npm của React. Người nhận chỉ cần
     chạy "npm install" là nó sẽ tự động tải lại).

  3. Thư mục "FE/dist/"
     (Chứa bản build tĩnh của frontend, không cần thiết khi chia sẻ code).

  4. Thư mục ".git/" (nằm trong thư mục gốc SHMS_Hackathon_demo, bị ẩn)
     (Nếu bạn không cần giữ lại lịch sử commit, có thể xoá thư mục này
     để giảm bớt dung lượng rác của Git).

  Tóm lại: Khi share, chỉ giữ lại source code (src), pom.xml, package.json
  và file cấu hình. Người nhận sẽ tự chạy "mvn clean compile" và
  "npm install" để dựng lại môi trường!

================================================================================
10. KHẮC PHỤC SỰ CỐ (TROUBLESHOOTING)
================================================================================

  1. Lỗi "SchemaManagementException: Schema-validation: missing column..."
     khi khởi chạy Backend:
     => Lỗi này xảy ra khi cấu trúc bảng trong SQL Server không khớp với 
        cấu trúc Entity trong Java (ví dụ thiếu cột version, history_log...).
     => CÁCH KHẮC PHỤC: Hệ thống đã được bổ sung file Flyway V3. Hãy đảm 
        bảo bạn khởi chạy trên một Database hoàn toàn trống để Flyway tự 
        động chạy cả V1, V2 và V3. Nếu bạn đang dùng DB cũ, hãy DROP 
        database đó đi và CREATE lại database mới (xem Bước 4.1).

  2. Lỗi "FlywayException: Validate failed: Migrations have failed validation"
     => Lỗi này xảy ra nếu bạn đã chỉnh sửa nội dung các file script V1, V2 
        hoặc V3 sau khi chúng đã được chạy vào Database (sai checksum).
     => CÁCH KHẮC PHỤC: Xóa Database cũ và tạo lại Database mới hoàn toàn.
        Lệnh: DROP DATABASE SHMS_Hackathon; CREATE DATABASE SHMS_Hackathon;

================================================================================
  END OF README.txt
================================================================================
