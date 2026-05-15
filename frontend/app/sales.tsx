import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, ScrollView, Modal, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Search, Calendar, Filter, X, CalendarDays, ShoppingBag, Download, TrendingUp, CreditCard, PieChart, Users, ArrowRight } from "lucide-react-native";
import { Colors } from "../constants/Colors";
import { format } from "date-fns";
import React, { useState, useRef } from "react";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { DatePickerInput } from '../components/DatePickerInput';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';
import { LeadSkeleton } from "../components/Skeleton";

interface OrderItem {
  quantity: number;
  product: {
    name: string;
    sku: string;
    price: number;
  };
}

interface Order {
  id: string;
  total_price: string;
  createdAt: string;
  lead: {
    customer_name: string;
  };
  processor: {
    name: string;
  };
  items: OrderItem[];
}


const OrderCard = ({ item, onPress }: { item: Order, onPress: (id: string) => void }) => {
  const itemsSummary = item.items?.map(i => `${i.quantity}x ${i.product?.name}`).join(', ') || "No items";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item.id)}
      className="bg-card border border-border p-6 rounded-[32px] mb-4 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 mr-4">
          <View className="flex-row items-center mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
            <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              Order #{item.id.slice(0, 8)}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold leading-7 mb-1" numberOfLines={1}>
            {item.lead?.customer_name || "Unknown Customer"}
          </Text>
          <Text className="text-muted-foreground text-xs font-medium italic" numberOfLines={2}>
            {itemsSummary}
          </Text>
        </View>
        <View className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
          <Text className="text-primary font-black text-lg">₹{parseFloat(item.total_price).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-4 border-t border-border/20">
        <View className="flex-row items-center">
          <Calendar size={12} color={Colors.muted} />
          <Text className="text-muted-foreground text-[10px] ml-1.5 font-semibold">
            {format(new Date(item.createdAt), "MMM dd, yyyy")}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Users size={12} color={Colors.muted} />
          <Text className="text-muted-foreground text-[10px] ml-1.5 font-bold uppercase tracking-tighter">
            By {item.processor?.name || "System"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Sales() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const [exporting, setExporting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Task: Details Query
  const { data: orderDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["order-details", selectedOrderId],
    queryFn: async () => {
      const response = await api.get(`/sales/${selectedOrderId}`);
      return response.data;
    },
    enabled: !!selectedOrderId,
  });

  // Task A: KPIs
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["sales-stats", user?.id],
    queryFn: async () => {
      const response = await api.get("/sales/stats");
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Task B: Orders List
  const {
    data: infiniteData,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["sales", user?.id, search, dateRange],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get("/sales", {
        params: {
          search: search || undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          limit: 10,
          offset: pageParam,
        }
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const { offset, limit, totalItems } = lastPage.meta;
      const nextOffset = (offset || 0) + (limit || 10);
      return nextOffset < totalItems ? nextOffset : undefined;
    },
    enabled: !!user?.id,
  });

  const orders = infiniteData?.pages.flatMap(page => page.data) || [];

  // Task D: Excel Export
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const downloadUrl = `${api.defaults.baseURL}/sales/export?${params.toString()}`;

      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      } else {
        const { cacheDirectory, downloadAsync } = FileSystem as any;
        const fileUri = `${cacheDirectory}sales_report.xlsx`;

        // Fetch tokens for non-Axios request
        const token = await AsyncStorage.getItem("token");
        const userStr = await AsyncStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const downloadRes = await downloadAsync(downloadUrl, fileUri, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user?.id || '',
          }
        });

        if (downloadRes.status === 200) {
          if (Platform.OS === 'android') {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const base64 = await FileSystem.readAsStringAsync(downloadRes.uri, { encoding: FileSystem.EncodingType.Base64 });
              const uri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'sales_report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
              Toast.show({ type: 'success', text1: 'Saved Successfully', text2: 'File saved to your selected folder.' });
            } else {
              // Fallback to sharing if permission denied
              await Sharing.shareAsync(downloadRes.uri);
            }
          } else {
            await Sharing.shareAsync(downloadRes.uri);
          }
        } else {
          throw new Error("Failed to download file");
        }
      }
      Toast.show({ type: 'success', text1: 'Export Complete', text2: 'Sales report generated successfully.' });
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Export Failed', text2: 'Could not generate sales report.' });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading && !isRefetching) {
    return (
      <SafeAreaView className="flex-1 bg-background px-6 pt-12">
        <LeadSkeleton />
        <LeadSkeleton />
        <LeadSkeleton />
        <LeadSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="light" backgroundColor={Colors.background} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            item={item}
            onPress={(id) => setSelectedOrderId(id)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 100 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-6" color={Colors.primary} /> : null}
        ListHeaderComponent={
          <View className="mb-8">
            <View className="flex-row justify-between items-start mb-8">
              <View className="flex-1">
                <Text className="text-primary font-bold tracking-widest uppercase text-[10px] mb-1">Revenue Hub</Text>
                <Text className="text-white text-4xl font-black tracking-tight">Sales</Text>
              </View>
              <TouchableOpacity
                onPress={handleExport}
                disabled={exporting}
                className="bg-primary p-4 rounded-3xl shadow-xl shadow-primary/40 flex-row items-center"
              >
                {exporting ? <ActivityIndicator size="small" color="white" /> : <Download size={24} color="white" />}
                <Text className="text-white font-bold ml-2">Export</Text>
              </TouchableOpacity>
            </View>


            {/* Task C: Filters */}
            <View className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-14 mb-4">
              <Search size={20} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-3 text-base"
                placeholder="Search Customer or SKU..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && <TouchableOpacity onPress={() => setSearch("")}><X size={18} color={Colors.muted} /></TouchableOpacity>}
            </View>

            <TouchableOpacity
              onPress={() => setDateModalVisible(true)}
              className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-14"
            >
              <CalendarDays size={20} color={Colors.muted} />
              <Text className="flex-1 text-white ml-3 text-base">
                {dateRange.start ? `${dateRange.start} to ${dateRange.end || 'Now'}` : "Filter by Date Range"}
              </Text>
              {dateRange.start && <TouchableOpacity onPress={() => setDateRange({ start: null, end: null })}><X size={18} color={Colors.muted} /></TouchableOpacity>}
            </TouchableOpacity>
          </View>
        }
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchStats(); }} tintColor={Colors.primary} colors={[Colors.primary]} progressBackgroundColor={Colors.card} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-card w-24 h-24 rounded-3xl items-center justify-center mb-6 border border-border shadow-2xl">
              <ShoppingBag size={40} color={Colors.muted} />
            </View>
            <Text className="text-white text-2xl font-bold mb-2">No orders found</Text>
            <Text className="text-gray-400 text-center px-10 leading-6">Try adjusting your search filters or date range.</Text>
          </View>
        }
      />

      {/* Date Picker Modal */}
      <Modal animationType="fade" transparent visible={dateModalVisible} onRequestClose={() => setDateModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className="bg-card w-full rounded-[40px] p-8 border border-border shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View><Text className="text-white text-2xl font-bold">Sales Period</Text><Text className="text-muted-foreground text-sm">Select date range</Text></View>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}><X size={24} color={Colors.muted} /></TouchableOpacity>
            </View>
            <View className="space-y-6">
              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">Start Date</Text>
                <DatePickerInput
                  value={tempDateRange.start}
                  onChange={(d) => setTempDateRange(p => ({ ...p, start: d }))}
                  placeholder="Select Start"
                />
              </View>
              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">End Date</Text>
                <DatePickerInput
                  value={tempDateRange.end}
                  onChange={(d) => setTempDateRange(p => ({ ...p, end: d }))}
                  placeholder="Select End"
                />
              </View>
              <View className="flex-row gap-3 pt-4">
                <TouchableOpacity onPress={() => { setDateRange({ start: null, end: null }); setTempDateRange({ start: null, end: null }); setDateModalVisible(false); }} className="flex-1 h-14 rounded-2xl items-center justify-center border border-border"><Text className="text-white font-bold">Clear</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setDateRange({ start: tempDateRange.start ? format(tempDateRange.start, "yyyy-MM-dd") : null, end: tempDateRange.end ? format(tempDateRange.end, "yyyy-MM-dd") : null }); setDateModalVisible(false); }} className="flex-2 h-14 rounded-2xl items-center justify-center bg-primary px-10"><Text className="text-white font-bold text-lg">Apply</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      </Modal>

      {/* Order Details Modal (Minimalist) */}
      <Modal
        animationType="fade"
        transparent
        visible={!!selectedOrderId}
        onRequestClose={() => setSelectedOrderId(null)}
      >
        <View className="flex-1 justify-center bg-black/80 px-6">
          <View className="bg-card rounded-[40px] p-8 border border-border shadow-2xl">
            {isLoadingDetails ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : orderDetails?.data ? (
              <View>
                <View className="flex-row justify-between items-center mb-6">
                  <View>
                    <Text className="text-white text-2xl font-black">Order Details</Text>
                    <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">#{orderDetails.data.id.slice(0, 12)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedOrderId(null)} className="bg-white/5 p-2 rounded-full">
                    <X size={20} color={Colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Compact Info Row */}
                <View className="flex-row justify-between items-center bg-background/50 p-4 rounded-2xl mb-6">
                  <View>
                    <Text className="text-muted-foreground text-[10px] font-bold uppercase mb-1">Customer</Text>
                    <Text className="text-white font-bold">{orderDetails.data.lead?.customer_name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-muted-foreground text-[10px] font-bold uppercase mb-1">Date</Text>
                    <Text className="text-white font-bold">{format(new Date(orderDetails.data.createdAt), "MMM dd")}</Text>
                  </View>
                </View>

                {/* Simplified Item List */}
                <View className="mb-6 max-h-40">
                  <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-[2px] mb-3 px-1">Items</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {orderDetails.data.items?.map((item: any, idx: number) => {
                      const actualItem = Array.isArray(item) ? item[0] : item;
                      return (
                        <View key={idx} className="flex-row justify-between py-2 border-b border-border/10">
                          <Text className="text-white text-sm flex-1 mr-2" numberOfLines={1}>{actualItem.product?.name}</Text>
                          <Text className="text-primary font-bold text-sm">x{actualItem.quantity}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Final Total Bar */}
                <View className="bg-primary/10 p-5 rounded-3xl border border-primary/20 flex-row justify-between items-center">
                  <View>
                    <Text className="text-primary text-[10px] font-black uppercase tracking-widest mb-0.5">Total Amount</Text>
                    <Text className="text-primary text-2xl font-black">₹{parseFloat(orderDetails.data.total_price).toLocaleString('en-IN')}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-muted-foreground text-[10px] font-bold uppercase mb-0.5">Processed By</Text>
                    <Text className="text-white font-bold text-xs">{orderDetails.data.processor?.name?.split(' ')[0]}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedOrderId(null)}
                  className="mt-6 h-14 bg-white/5 rounded-2xl items-center justify-center border border-white/10"
                >
                  <Text className="text-white font-bold">Close Details</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
