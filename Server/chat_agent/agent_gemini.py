
# =========================
# 1. IMPORT
# =========================
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain.agents import create_agent

import os
import sys

# Thêm project root vào path để import service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# =========================
# 2. IMPORT SERVICES & DB
# =========================
from app.database import SessionLocal
from app.services.Price import (
    calc_avg_price_by_district_name,
    calc_avg_price_by_ward_name,
    calc_avg_price_by_province_name,
)
from app.services.price_history import (
    calc_monthly_avg_price_by_district_name,
    calc_monthly_avg_price_by_province_name,
)
from app.services.listings import (
    fetch_listings_by_district_name,
    fetch_listings_by_ward_name,
)

# =========================
# 3. HELPER FUNCTION
# =========================
def get_db_session():
    """
    Tạo database session mới.

    Lưu ý:
    - Mỗi tool phải tự mở và đóng session
    - Tránh leak connection
    """
    return SessionLocal()


# =========================
# 4. DEFINE TOOLS
# =========================

@tool
def get_avg_price_by_ward(ward_name: str) -> str:
    """
    Lấy giá nhà trung bình theo m² trong một xã/phường cụ thể.

    Dùng khi:
    - Người dùng hỏi giá nhà tại một phường
    - So sánh giá giữa các phường

    Args:
        ward_name: Tên xã/phường (ví dụ: 'Phường Phúc Xá', 'Phường Quán Thánh')

    Returns:
        Chuỗi mô tả gồm:
        - Giá trung bình (đ/m²)
        - Tổng số căn nhà trong dữ liệu

    Ví dụ:
        "Giá trung bình tại Phường Phúc Xá: 45,000,000 đ/m² (120 căn)"
    """
    try:
        db = get_db_session()
        avg_price, total = calc_avg_price_by_ward_name(db, ward_name)
        db.close()

        if avg_price:
            return f"Giá trung bình tại {ward_name}: {avg_price:,.0f} đ/m² ({total} căn)"
        return f"Không có dữ liệu giá cho {ward_name}"

    except Exception as e:
        return f"Lỗi khi lấy dữ liệu phường: {str(e)}"


@tool
def get_avg_price_by_district(district_name: str) -> str:
    """
    Lấy giá nhà trung bình theo m² trong một quận/huyện.

    Dùng khi:
    - Người dùng hỏi giá nhà tại một quận
    - So sánh giá giữa các quận/huyện

    Args:
        district_name: Tên quận/huyện (ví dụ: 'Quận Ba Đình', 'Quận 1')

    Returns:
        Chuỗi gồm:
        - Giá trung bình (đ/m²)
        - Tổng số căn

    Ví dụ:
        "Giá trung bình tại Quận Ba Đình: 120,000,000 đ/m² (350 căn)"
    """
    try:
        db = get_db_session()
        avg_price, total = calc_avg_price_by_district_name(db, district_name)
        db.close()

        if avg_price:
            return f"Giá trung bình tại {district_name}: {avg_price:,.0f} đ/m² ({total} căn)"
        return f"Không có dữ liệu giá cho {district_name}"

    except Exception as e:
        return f"Lỗi khi lấy dữ liệu quận: {str(e)}"


@tool
def get_avg_price_by_province(province_name: str) -> str:
    """
    Lấy giá nhà trung bình theo m² trong một tỉnh/thành phố.

    Dùng khi:
    - So sánh giữa các thành phố lớn (Hà Nội vs TP.HCM)
    - Phân tích thị trường theo tỉnh

    Args:
        province_name: Tên tỉnh/thành phố (ví dụ: 'Hà Nội', 'TP.HCM')

    Returns:
        Chuỗi gồm:
        - Giá trung bình
        - Tổng số căn

    Ví dụ:
        "Giá trung bình tại Hà Nội: 80,000,000 đ/m² (5000 căn)"
    """
    try:
        db = get_db_session()
        avg_price, total = calc_avg_price_by_province_name(db, province_name)
        db.close()

        if avg_price:
            return f"Giá trung bình tại {province_name}: {avg_price:,.0f} đ/m² ({total} căn)"
        return f"Không có dữ liệu giá cho {province_name}"

    except Exception as e:
        return f"Lỗi khi lấy dữ liệu tỉnh: {str(e)}"


@tool
def get_monthly_price_by_district(district_name: str) -> str:
    """
    Phân tích xu hướng giá nhà theo tháng trong 12 tháng gần nhất tại một quận.

    Dùng khi:
    - Người dùng hỏi "giá có tăng không?"
    - Phân tích xu hướng thị trường

    Args:
        district_name: Tên quận/huyện

    Returns:
         danh sách giá trong 12 tháng

   
    """
    try:
        db = get_db_session()
        _, monthly_prices = calc_monthly_avg_price_by_district_name(
            db, district_name, None, months=12
        )
        db.close()

        if not monthly_prices:
            return f"Không có dữ liệu cho {district_name}"

        latest = monthly_prices[-1]
        price = latest["avg_price_per_m2"]

        trend = "↑" if len(monthly_prices) > 1 and price > monthly_prices[-2]["avg_price_per_m2"] else "↓"

        return f"Giá {district_name}: {price:,.0f} đ/m² {trend}"

    except Exception as e:
        return f"Lỗi khi phân tích xu hướng: {str(e)}"


@tool
def get_monthly_price_by_province(province_name: str) -> str:
    """
    Phân tích xu hướng giá nhà theo tháng tại cấp tỉnh/thành phố.

    Args:
        province_name: Tên tỉnh/thành phố

    Returns:
        danh sách giá trong 12 tháng
    """
    try:
        db = get_db_session()
        _, monthly_prices = calc_monthly_avg_price_by_province_name(
            db, province_name, None, months=12
        )
        db.close()

        if not monthly_prices:
            return f"Không có dữ liệu cho {province_name}"

        latest = monthly_prices[-1]
        price = latest["avg_price_per_m2"]

        trend = "↑" if len(monthly_prices) > 1 and price > monthly_prices[-2]["avg_price_per_m2"] else "↓"

        return f"Giá {province_name}: {price:,.0f} đ/m² {trend}"

    except Exception as e:
        return f"Lỗi khi phân tích xu hướng: {str(e)}"


@tool
def get_listings_by_district(district_name: str) -> str:
    """
    Lấy danh sách các căn nhà mới nhất trong một quận.

    Dùng khi:
    - Người dùng muốn xem listing cụ thể
    - Tham khảo giá thực tế

    Args:
        district_name: Tên quận/huyện (lưu ý khi chuyền vào hàm chỉ chuyền tên không ghi huyện ở trước)

    Returns:
        Danh sách căn nhà trong 1 huyện và thông tin tương ứ
    """
    try:
        db = get_db_session()
        listings = fetch_listings_by_district_name(db, district_name, None, limit=5)
        db.close()

        if not listings:
            return f"Không có nhà nào ở {district_name}"

        result = f"🏠 {district_name}:\n"
        for i, item in enumerate(listings, 1):
            result += (
                f"{i}. {item.get('price',0):,.0f}đ | "
                f"{item.get('area',0)}m² | "
                f"{item.get('price_per_m2',0):,.0f} đ/m²\n"
            )

        return result

    except Exception as e:
        return f"Lỗi khi lấy listing: {str(e)}"


@tool
def get_listings_by_ward(ward_name: str) -> str:
    """
    Lấy danh sách nhà theo phường.

    Args:
        ward_name: Tên phường (lưu ý khi chuyền vào hàm chỉ chuyền tên không ghi phường ở trước)

    Returns:
        Danh sách căn nhà trong phường
    """
    try:
        db = get_db_session()
        listings = fetch_listings_by_ward_name(db, ward_name, None, limit=5)
        db.close()

        if not listings:
            return f"Không có nhà nào ở {ward_name}"

        result = f"🏠 {ward_name}:\n"
        for i, item in enumerate(listings, 1):
            result += (
                f"{i}. {item.get('price',0):,.0f}đ | "
                f"{item.get('area',0)}m² | "
                f"{item.get('price_per_m2',0):,.0f} đ/m²\n"
            )

        return result

    except Exception as e:
        return f"Lỗi khi lấy listing: {str(e)}"


# =========================
# 5. TOOL LIST
# =========================
tools = [
    get_avg_price_by_ward,
    get_avg_price_by_district,
    get_avg_price_by_province,
    get_monthly_price_by_district,
    get_monthly_price_by_province,
    get_listings_by_district,
    get_listings_by_ward,
]


# =========================
# 6. LLM
# =========================
llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview",
    temperature=0.3,
    convert_system_message_to_human=True
)


# =========================
# 7. AGENT (LANGGRAPH)
# =========================
agent = create_agent(
    model=llm,
    tools=tools,
    system_prompt="""
Bạn là AI tư vấn bất động sản.

- Luôn gọi tool khi cần dữ liệu thực tế
- So sánh nếu user yêu cầu so sánh
- Trả lời rõ ràng, dễ hiểu
"""
)


# =========================
# 8. TEST FUNCTION
# =========================
def run_query(query: str):
    print("=" * 60)
    print(f"QUERY: {query}")
    print("=" * 60)

    response = agent.invoke({
        "messages": [("user", query)]
    })

    print("\n📊 KẾT QUẢ:")
    print(response["messages"][-1].content)
    print("\n")


# =========================
# 9. MAIN
# =========================
if __name__ == "__main__":
    run_query("nên mua nhà ở đâu trong hà đông hay cầu giấy")


