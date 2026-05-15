import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, ScrollView, Modal, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useInfiniteQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Search, Calendar, Filter, X, CalendarDays, History, TrendingUp, TrendingDown, ArrowRight } from "lucide-react-native";
import { Colors } from "../constants/Colors";
import { format } from "date-fns";
import React, { useState, useRef } from "react";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LeadSkeleton } from "../components/Skeleton";
import { DatePickerInput } from '../components/DatePickerInput';

interface Transaction {
  id: string;
  product_id: string;
  change_amount: number;
  type: "RESTOCK" | "SALE" | "CONVERSION" | "INITIAL_STOCK";
  timestamp: string;
  product: {
    name: string;
    sku: string;
  };
}

const TransactionItem = ({ item }: { item: Transaction }) => {
  const isAddition = item.change_amount > 0;
  const absAmount = Math.abs(item.change_amount);

  return (
    <View className="bg-card border border-border p-6 rounded-[32px] mb-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 mr-4">
          <View className="flex-row items-center mb-1">
            <View className={`w-2 h-2 rounded-full mr-2 ${isAddition ? "bg-emerald-500" : "bg-red-500"}`} />
            <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              {item.type?.replace('_', ' ')}
            </Text>
          </View>
          <Text className="text-white text-xl font-bold leading-7 mb-1" numberOfLines={2}>
            {item.product?.name || "Unidentified Product"}
          </Text>
          <Text className="text-muted-foreground text-xs font-medium tracking-tight">
            SKU: {item.product?.sku || "N/A"}
          </Text>
        </View>

        <View className="items-end">
          <View className={`px-4 py-2 rounded-2xl ${isAddition ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            <Text className={`text-lg font-black ${isAddition ? "text-emerald-500" : "text-red-500"}`}>
              {isAddition ? "+" : "-"}{absAmount}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-4 border-t border-border/20">
        <View className="flex-row items-center">
          <View className="bg-white/5 p-1.5 rounded-lg mr-2">
            <Calendar size={12} color={Colors.muted} />
          </View>
          <Text className="text-muted-foreground text-[10px] font-semibold">
            {format(new Date(item.timestamp), "MMM dd, yyyy • HH:mm")}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function Transactions() {
  const { user } = useAuth();

  // States
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string | null>(null); // null = ALL
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // Date Picker States
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  const {
    data: infiniteData,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["transactions", user?.id, search, type, dateRange],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get("/warehouse/transactions", {
        params: {
          search: search || undefined,
          type: type || undefined,
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

  const transactions = infiniteData?.pages.flatMap(page => page.data) || [];
  const totalTransactions = infiniteData?.pages[0]?.meta?.totalItems || 0;

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
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 100 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View className="mb-8">
            <View className="flex-row justify-between items-start mb-8">
              <View className="flex-1">
                <Text className="text-primary font-medium tracking-widest uppercase mb-2">Inventory Audit</Text>
                <Text className="text-white text-5xl font-extrabold tracking-tight">Logs</Text>
                <Text className="text-gray-400 text-lg mt-4 leading-8">
                  Monitoring {totalTransactions} movements across the catalog.
                </Text>
              </View>
              <View className="bg-violet-500/20 p-4 rounded-3xl border border-violet-500/20">
                <History size={28} color="#a78bfa" />
              </View>
            </View>

            {/* Search Bar */}
            <View className="bg-card border border-border rounded-2xl flex-row items-center px-4 h-14 mb-6 shadow-sm">
              <Search size={20} color={Colors.muted} />
              <TextInput
                className="flex-1 text-white ml-3 text-base"
                placeholder="Filter by product or SKU..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={18} color={Colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Type Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-6">
              {[
                { label: "All Movements", value: null },
                { label: "Restocks", value: "RESTOCK" },
                { label: "Sales", value: "SALE" },
                { label: "Initial", value: "INITIAL_STOCK" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.label}
                  onPress={() => setType(tab.value)}
                  className={`mr-3 px-6 py-3 rounded-full border ${type === tab.value
                    ? "bg-primary border-primary"
                    : "bg-card border-border"
                    }`}
                >
                  <Text className={`font-bold ${type === tab.value ? "text-white" : "text-muted-foreground"}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Filters */}
            <View className="flex-row items-center">
              <Calendar size={16} color={Colors.muted} className="mr-3" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {[
                  { label: "All Time", start: null },
                  { label: "Today", start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() },
                  { label: "Last 7 Days", start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                ].map((preset) => {
                  const isActive = dateRange.start === preset.start && !dateRange.end;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => setDateRange({ start: preset.start, end: null })}
                      className={`mr-2 px-4 py-2 rounded-xl border ${isActive
                        ? "bg-primary/20 border-primary/40"
                        : "bg-card/50 border-border/50"
                        }`}
                    >
                      <Text className={`text-xs font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => setDateModalVisible(true)}
                  className={`px-4 py-2 rounded-xl border flex-row items-center ${dateRange.end ? "bg-primary/20 border-primary/40" : "bg-card/50 border-border/50"}`}
                >
                  <CalendarDays size={14} color={dateRange.end ? Colors.primary : Colors.muted} className="mr-2" />
                  <Text className={`text-xs font-semibold ${dateRange.end ? "text-primary" : "text-muted-foreground"}`}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-card w-24 h-24 rounded-3xl items-center justify-center mb-6 border border-border shadow-2xl">
              <History size={40} color={Colors.muted} />
            </View>
            <Text className="text-white text-2xl font-bold mb-2">No records found</Text>
            <Text className="text-gray-400 text-center px-10 leading-6">
              No inventory movements match your current filters.
            </Text>
          </View>
        }
      />

      {/* Date Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={dateModalVisible}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-6">
          <View className="bg-card w-full rounded-[40px] p-8 border border-border shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-white text-2xl font-bold">Custom Range</Text>
                <Text className="text-muted-foreground text-sm">Select audit period</Text>
              </View>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">Start Date</Text>
                <DatePickerInput
                  value={tempDateRange.start}
                  onChange={(d) => setTempDateRange(prev => ({ ...prev, start: d }))}
                  placeholder="Select Start Date"
                />
              </View>

              <View>
                <Text className="text-muted-foreground text-xs font-bold mb-3 uppercase tracking-widest">End Date</Text>
                <DatePickerInput
                  value={tempDateRange.end}
                  onChange={(d) => setTempDateRange(prev => ({ ...prev, end: d }))}
                  placeholder="Select End Date"
                />
              </View>

              <View className="flex-row gap-3 pt-4">
                <TouchableOpacity
                  onPress={() => {
                    setDateRange({ start: null, end: null });
                    setTempDateRange({ start: null, end: null });
                    setDateModalVisible(false);
                  }}
                  className="flex-1 h-14 rounded-2xl items-center justify-center border border-border bg-transparent"
                >
                  <Text className="text-white font-bold">Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setDateRange({
                      start: tempDateRange.start ? format(tempDateRange.start, "yyyy-MM-dd") : null,
                      end: tempDateRange.end ? format(tempDateRange.end, "yyyy-MM-dd") : null
                    });
                    setDateModalVisible(false);
                  }}
                  className="flex-2 h-14 rounded-2xl items-center justify-center bg-primary px-10"
                >
                  <Text className="text-white font-bold text-lg">Apply Filter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>


      </Modal>
    </SafeAreaView>
  );
}
