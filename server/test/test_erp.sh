#!/bin/bash

# Configuration
API_URL="http://localhost:5000/api"
REPORT_FILE="./test_report.md"

# FIXED DATA IDs from seeders
ADMIN_ID="1ed30055-d801-4267-bbc1-9e329f4c11ea"
SALES_ID="c23cf398-7960-49ef-a263-7b08f3271aed"
WH_ID="7c42123f-cd9f-435e-b9b2-cd5b47ea0953"

VALID_LEAD="9b81a0c3-236a-4438-9724-bc693324c70b" 
LAPTOP_ID="f18ea437-1cee-400b-a244-77c5e19d01a2"   
OUT_OF_STOCK_ID="e4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4"

# Function to get JWT token
get_token() {
    local EMAIL=$1
    local PASSWORD=$2
    curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" | grep -oP '"token":"\K[^"]+'
}

ADMIN_TOKEN=$(get_token "admin@meetel.com" "admin123")
SALES_TOKEN=$(get_token "sales@meetel.com" "sales123")
WH_TOKEN=$(get_token "wh@meetel.com" "wh123")

run_test() {
    local NAME=$1; local METHOD=$2; local ENDPOINT=$3; local DATA=$4; local TOKEN=$5; local EXPECTED_CODE=$6
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X $METHOD "$API_URL$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$DATA")

    HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_STATUS" -eq "$EXPECTED_CODE" ]; then
        echo "✅ PASS: $NAME ($HTTP_STATUS)"
        echo "- **PASS**: $NAME ($HTTP_STATUS)" >> $REPORT_FILE
    else
        echo "❌ FAIL: $NAME (Expected $EXPECTED_CODE, got $HTTP_STATUS)"
        echo "- **FAIL**: $NAME (Expected $EXPECTED_CODE, got $HTTP_STATUS) - Response: $BODY" >> $REPORT_FILE
    fi
}

echo "# ERP System Integration Report - $(date)" > $REPORT_FILE
echo "## Test Results" >> $REPORT_FILE

# --- 1. CRM & RBAC TESTS ---
run_test "Security: Warehouse cannot fetch leads" "GET" "/leads" "" "$WH_TOKEN" 403
run_test "CRM: Fetch Leads (Paginated)" "GET" "/leads?limit=5&offset=0" "" "$SALES_TOKEN" 200
run_test "CRM: Search Leads" "GET" "/leads?search=Global" "" "$SALES_TOKEN" 200
run_test "CRM: Create new lead" "POST" "/leads" \
'{"customer_name": "Test Startup", "assigned_to": "c23cf398-7960-49ef-a263-7b08f3271aed"}' "$SALES_TOKEN" 201

# --- 2. SALES & GOLDEN PATH TESTS ---
run_test "Golden Path: Convert Lead to Order" "POST" "/orders/convert" \
"{\"leadId\": \"$VALID_LEAD\", \"productId\": \"$LAPTOP_ID\", \"quantity\": 1}" "$SALES_TOKEN" 201

run_test "Validation: Cannot convert already converted lead" "POST" "/orders/convert" \
"{\"leadId\": \"$VALID_LEAD\", \"productId\": \"$LAPTOP_ID\", \"quantity\": 1}" "$SALES_TOKEN" 400

run_test "Sales: Get Orders (Paginated)" "GET" "/sales?limit=10&offset=0" "" "$SALES_TOKEN" 200
run_test "Sales: Search SKU" "GET" "/sales?search=LAP-001" "" "$SALES_TOKEN" 200
run_test "Sales: Get Stats" "GET" "/sales/stats" "" "$SALES_TOKEN" 200

# --- 3. WAREHOUSE TESTS ---
run_test "Warehouse: Get Inventory (Paginated)" "GET" "/warehouse/inventory?limit=5" "" "$SALES_TOKEN" 200
run_test "Warehouse: Search Inventory" "GET" "/warehouse/inventory?search=Laptop" "" "$SALES_TOKEN" 200
run_test "Security: Sales cannot restock" "POST" "/warehouse/restock" \
"{\"productId\": \"$LAPTOP_ID\", \"amount\": 10}" "$SALES_TOKEN" 403
run_test "Warehouse: Manual restock" "POST" "/warehouse/restock" \
"{\"productId\": \"$LAPTOP_ID\", \"amount\": 10}" "$WH_TOKEN" 200

# --- 4. DASHBOARD TESTS ---
run_test "Dashboard: Admin view" "GET" "/dashboard" "" "$ADMIN_TOKEN" 200
run_test "Dashboard: Sales view" "GET" "/dashboard" "" "$SALES_TOKEN" 200
run_test "Dashboard: Warehouse view" "GET" "/dashboard" "" "$WH_TOKEN" 200
run_test "Security: Missing headers on Dashboard" "GET" "/dashboard" "" "" 401

# --- 5. EXCEL EXPORT TESTS (Worker Threads) ---
run_test "Export: Leads list (Filtered)" "GET" "/leads/export?status=NEW" "" "$SALES_TOKEN" 200
run_test "Export: Orders list (Date Range)" "GET" "/sales/export?startDate=2024-01-01" "" "$SALES_TOKEN" 200
run_test "Export: Inventory Report" "GET" "/warehouse/export" "" "$WH_TOKEN" 200

echo ""
echo "Testing complete. Check $REPORT_FILE for detailed results."