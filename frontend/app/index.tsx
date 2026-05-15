import { useAuth } from "../context/AuthContext";
import {
  LogOut,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertTriangle,
  Package,
  ArrowRight,
  Boxes,
  Zap,
  Activity,
  Download,
  Search,
  Calendar,
  X,
  FileText,
  Trophy,
  Star,
  Medal
} from "lucide-react-native";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatePickerInput } from '../components/DatePickerInput';
import Toast from 'react-native-toast-message';
import { Platform, Modal, TextInput } from "react-native";
import { Colors } from "../constants/Colors";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { DashboardSkeleton } from "../components/Skeleton";

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  onPress,
  alert = false
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
  onPress?: () => void;
  alert?: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [alert]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className={`bg-card/40 p-6 rounded-[32px] border border-border mb-4 shadow-2xl flex-1 mx-2 min-w-[160px] ${alert ? "border-red-500/50 bg-red-500/5" : ""
        }`}
    >
      <View className="flex-row justify-between items-start mb-6">
        <Animated.View
          style={alert ? { transform: [{ scale: pulseAnim }] } : {}}
          className={`w-12 h-12 rounded-2xl items-center justify-center ${alert ? "bg-red-500/20" : `bg-${color}/20`
            }`}
        >
          <Icon size={24} color={alert ? "#ef4444" : (Colors[color as keyof typeof Colors] || Colors.primary)} />
        </Animated.View>
        {onPress && <ArrowRight size={16} color={Colors.muted} />}
      </View>

      <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">{title}</Text>
      <Text className={`text-3xl font-black ${alert ? "text-red-500" : "text-white"}`}>
        {value}
      </Text>
      {subtitle && (
        <Text className="text-muted text-[10px] mt-2 font-medium">{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const role = user?.role?.toUpperCase();

  const [exportModal, setExportModal] = useState<{ visible: boolean; type: 'leads' | 'warehouse' | 'sales' | 'warehouse/transactions' | null }>({ visible: false, type: null });
  
  // Default to current month
  const getInitialFilters = () => {
    const now = new Date();
    return {
      search: "",
      status: "",
      type: "",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date()
    };
  };

  const [exportFilters, setExportFilters] = useState(getInitialFilters());
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: dashboard, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const response = await api.get("/dashboard");
      return response.data;
    },
    enabled: !!user?.id,
  });

  const handleExport = async () => {
    if (!exportModal.type) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFilters.search) params.append("search", exportFilters.search);
      if (exportFilters.status) params.append("status", exportFilters.status);
      if (exportFilters.type) params.append("type", exportFilters.type);
      if (exportFilters.startDate) params.append("startDate", format(exportFilters.startDate, "yyyy-MM-dd"));
      if (exportFilters.endDate) params.append("endDate", format(exportFilters.endDate, "yyyy-MM-dd"));

      const downloadUrl = `${api.defaults.baseURL}/${exportModal.type}/export?${params.toString()}`;
      const { cacheDirectory, downloadAsync, StorageAccessFramework, readAsStringAsync, writeAsStringAsync, EncodingType } = FileSystem as any;
      
      // Sanitize type to avoid creating non-existent subdirectories in cache
      const sanitizedType = exportModal.type.replace(/\//g, '_');
      const fileUri = `${cacheDirectory}${sanitizedType}_export_${Date.now()}.xlsx`;

      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      const userObj = userStr ? JSON.parse(userStr) : null;

      const downloadRes = await downloadAsync(downloadUrl, fileUri, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userObj?.id || '',
        }
      });

      if (downloadRes.status === 200) {
        if (Platform.OS === 'android') {
          const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await readAsStringAsync(downloadRes.uri, { encoding: EncodingType.Base64 });
            const uri = await StorageAccessFramework.createFileAsync(permissions.directoryUri, `${exportModal.type}_report.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });
            Toast.show({ type: 'success', text1: 'Export Saved', text2: 'File stored in selected folder.' });
          } else {
            await Sharing.shareAsync(downloadRes.uri);
          }
        } else {
          await Sharing.shareAsync(downloadRes.uri);
        }
        setExportModal({ visible: false, type: null });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Export Failed', text2: 'Could not generate report.' });
    } finally {
      setExporting(false);
    }
  };

  const renderAdminCards = (data: any) => (
    <View className="flex-row flex-wrap -mx-2">
      <MetricCard
        title="Total Revenue"
        value={`₹${data.totalRevenue?.toLocaleString()}`}
        icon={TrendingUp}
        color="emerald"
      />
      <MetricCard
        title="Total Leads"
        value={data.totalLeads}
        icon={Users}
        color="blue"
        onPress={() => router.push("/crm")}
      />
      <MetricCard
        title="Total Orders"
        value={data.totalOrders}
        icon={ShoppingCart}
        color="violet"
        onPress={() => router.push("/sales")}
      />
      <MetricCard
        title="Low Stock"
        value={data.lowStockAlerts}
        icon={AlertTriangle}
        alert={data.lowStockAlerts > 0}
        onPress={() => router.push("/warehouse?lowStock=true")}
      />
    </View>
  );

  const renderAdminInsights = (data: any) => (
    <View className="mt-12">
      {/* Top Sales Performance */}
      <View className="mb-10">
        <View className="flex-row items-center mb-6">
          <View className="bg-amber-500/10 p-2 rounded-xl mr-3">
            <Trophy size={20} color="#f59e0b" />
          </View>
          <Text className="text-white text-xl font-bold">Sales Champions</Text>
        </View>
        
        {data.topSalesPerformance?.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
            {data.topSalesPerformance.map((rep: any, index: number) => (
              <View key={rep.id} className="bg-card/40 border border-border p-6 rounded-[32px] mr-4 w-[280px]">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="bg-primary/20 w-10 h-10 rounded-full items-center justify-center">
                    <Text className="text-primary font-bold">{index + 1}</Text>
                  </View>
                  <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <Text className="text-emerald-500 text-[10px] font-black uppercase">{rep.conversions} Orders</Text>
                  </View>
                </View>
                <Text className="text-white font-bold text-lg mb-1">{rep.name}</Text>
                <Text className="text-muted text-xs mb-4">{rep.email}</Text>
                <View className="border-t border-border pt-4">
                  <Text className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Revenue Generated</Text>
                  <Text className="text-2xl font-black text-white">₹{rep.revenue?.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="bg-card/20 border border-dashed border-border p-8 rounded-[32px] items-center">
            <Text className="text-muted text-sm">No sales data available for this period.</Text>
          </View>
        )}
      </View>

      {/* Top Selling Products */}
      <View>
        <View className="flex-row items-center mb-6">
          <View className="bg-violet-500/10 p-2 rounded-xl mr-3">
            <Star size={20} color="#8b5cf6" />
          </View>
          <Text className="text-white text-xl font-bold">Trending Products</Text>
        </View>

        <View className="bg-card/40 border border-border rounded-[32px] overflow-hidden">
          {data.topSellingProducts?.length > 0 ? (
            data.topSellingProducts.map((product: any, index: number) => (
              <View 
                key={product.id} 
                className={`p-5 flex-row items-center justify-between ${
                  index !== data.topSellingProducts.length - 1 ? 'border-b border-border/50' : ''
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-white/5 rounded-xl items-center justify-center mr-4">
                    <Package size={18} color={Colors.muted} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold" numberOfLines={1}>{product.name}</Text>
                    <Text className="text-muted text-[10px] uppercase tracking-tighter mt-1">{product.sku}</Text>
                  </View>
                </View>
                <View className="items-end ml-4">
                  <Text className="text-white font-black text-lg">{product.totalSold}</Text>
                  <Text className="text-muted text-[10px] uppercase font-medium">Sold</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="p-8 items-center">
              <Text className="text-muted text-sm">No product trends detected yet.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderSalesCards = (data: any) => (
    <View className="flex-row flex-wrap -mx-2">
      <MetricCard
        title="My Leads"
        value={data.myAssignedLeads}
        icon={Users}
        color="blue"
        onPress={() => router.push("/crm")}
      />
      <MetricCard
        title="My Orders"
        value={data.myProcessedOrders}
        icon={ShoppingCart}
        color="violet"
      />
      <MetricCard
        title="Top Item Price"
        value={`₹${data.topPremiumProducts?.[0]?.price || 0}`}
        subtitle={data.topPremiumProducts?.[0]?.name || "N/A"}
        icon={TrendingUp}
        color="emerald"
      />
    </View>
  );

  const renderWarehouseCards = (data: any) => (
    <View className="flex-row flex-wrap -mx-2">
      <MetricCard
        title="Total SKUs"
        value={data.totalSKUs}
        icon={Package}
        color="blue"
      />
      <MetricCard
        title="Critical Stock"
        value={data.criticalStockItems?.length || 0}
        icon={AlertTriangle}
        alert={(data.criticalStockItems?.length || 0) > 0}
        onPress={() => router.push("/warehouse?lowStock=true")}
      />
      <MetricCard
        title="Transactions Today"
        value={data.transactionsToday}
        icon={Activity}
        color="violet"
      />
    </View>
  );

  if (isLoading && !isRefetching) {
    return <DashboardSkeleton />;
  }

  const metrics = dashboard?.data;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <StatusBar style="light" backgroundColor={Colors.background} />

      <ScrollView
        className="flex-1 px-6 bg-background"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.card}
          />
        }
      >
        <View className="pt-12 pb-24">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-12">
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-emerald-500 font-bold tracking-widest text-[10px] uppercase">Enterprise Connected</Text>
              </View>
              <Text className="text-white text-5xl font-black tracking-tight">
                {user?.name?.split(' ')[0] || "User"}
              </Text>
              <Text className="text-muted text-lg mt-3 leading-7">
                Welcome to your command center.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => logout()}
              className="bg-card border border-border p-4 rounded-2xl"
            >
              <LogOut size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics */}
          <Text className="text-white text-2xl font-black mb-8">Pulse Overview</Text>

          {role === "ADMIN" && metrics && renderAdminCards(metrics)}
          {role === "SALES" && metrics && renderSalesCards(metrics)}
          {role === "WAREHOUSE" && metrics && renderWarehouseCards(metrics)}

          {role === "ADMIN" && metrics && renderAdminInsights(metrics)}

          {/* Action Modules */}
          <View className="mt-12">
            <Text className="text-white text-xl font-bold mb-6">Quick Actions</Text>

            <TouchableOpacity
              onPress={() => router.push("/crm")}
              className="bg-primary/10 border border-primary/20 p-6 rounded-[32px] mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-primary/20 p-3 rounded-2xl mr-4">
                  <Zap size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">Sales Pipeline</Text>
                  <Text className="text-muted text-xs">Manage leads and conversions</Text>
                </View>
              </View>
              <ArrowRight size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/warehouse")}
              className="bg-white/5 border border-white/5 p-6 rounded-[32px] flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-white/10 p-3 rounded-2xl mr-4">
                  <Boxes size={24} color={Colors.muted} />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">Inventory Flow</Text>
                  <Text className="text-muted text-xs">Stock levels and restock</Text>
                </View>
              </View>
              <ArrowRight size={20} color={Colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/sales")}
              className="bg-card border border-border p-6 rounded-[32px] mb-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-violet-500/10 p-3 rounded-2xl mr-4">
                  <ShoppingCart size={24} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="text-white font-bold text-lg">Transaction Ledger</Text>
                  <Text className="text-muted text-xs">Full order history and audit</Text>
                </View>
              </View>
              <ArrowRight size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Task Admin: Export Center */}
          {role === "ADMIN" && (
            <View className="mt-12 mb-20">
              <Text className="text-white text-xl font-bold mb-6">Admin Control Center</Text>
              <View className="flex-row flex-wrap -mx-2">
                {[
                  { id: 'leads', label: 'Export Leads', icon: Users, color: '#3b82f6', bg: 'bg-blue-500/20', cardBg: 'bg-blue-500/5 border-blue-500/20' },
                  { id: 'warehouse', label: 'Export Stock', icon: Boxes, color: '#10b981', bg: 'bg-emerald-500/20', cardBg: 'bg-emerald-500/5 border-emerald-500/20' },
                  { id: 'sales', label: 'Export Sales', icon: ShoppingCart, color: '#8b5cf6', bg: 'bg-violet-500/20', cardBg: 'bg-violet-500/5 border-violet-500/20' },
                  { id: 'warehouse/transactions', label: 'Export Logs', icon: Activity, color: '#f59e0b', bg: 'bg-amber-500/20', cardBg: 'bg-amber-500/5 border-amber-500/20' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setExportModal({ visible: true, type: item.id as any })}
                    className={`${item.cardBg} border p-6 rounded-[32px] mb-4 mx-2 flex-1 min-w-[150px] shadow-sm`}
                  >
                    <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${item.bg}`}>
                      <item.icon size={24} color={item.color} />
                    </View>
                    <Text className="text-white font-bold">{item.label}</Text>
                    <Text className="text-muted text-[10px] mt-1">Excel Generation</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Export Filter Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={exportModal.visible}
        onRequestClose={() => setExportModal({ visible: false, type: null })}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card rounded-t-[48px] p-8 min-h-[60%] border-t border-border shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-primary font-bold uppercase tracking-widest text-xs mb-1">Export Engine</Text>
                <Text className="text-white text-3xl font-black capitalize">{exportModal.type?.split('/').pop()} Filters</Text>
              </View>
              <TouchableOpacity onPress={() => setExportModal({ visible: false, type: null })} className="bg-white/5 p-3 rounded-full">
                <X size={20} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <View className="space-y-6">
              {/* Search Filter */}
              <View>
                <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-1">Global Search</Text>
                <View className="bg-background/50 border border-border rounded-2xl flex-row items-center px-4 h-14">
                  <Search size={20} color={Colors.muted} />
                  <TextInput
                    placeholder="Search query..."
                    placeholderTextColor={Colors.muted}
                    className="flex-1 ml-3 text-white font-medium"
                    value={exportFilters.search}
                    onChangeText={(t) => setExportFilters(p => ({ ...p, search: t }))}
                  />
                </View>
              </View>

              {/* Date Filters (For All Modules) */}
              <View className="mt-6">
                <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-1">Temporal Scope</Text>
                <View className="flex-row">
                  {/* Start Date */}
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text className="text-muted text-[10px] font-bold uppercase mb-1">Start Date</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={exportFilters.startDate ? format(exportFilters.startDate, 'yyyy-MM-dd') : ''}
                        style={{
                          width: '100%', height: 44, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                          padding: '0 12px', color: exportFilters.startDate ? '#fff' : 'rgba(255,255,255,0.35)',
                          fontSize: 14, cursor: 'pointer', outline: 'none',
                          colorScheme: 'dark', boxSizing: 'border-box', fontFamily: 'inherit',
                        } as React.CSSProperties}
                        onChange={(e) => {
                          const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                          if (d) setExportFilters(p => ({ ...p, startDate: d }));
                        }}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => setShowDatePicker('start')}
                        className="bg-background/50 border border-border rounded-2xl p-3"
                      >
                        <Text className="text-white font-bold">{exportFilters.startDate ? format(exportFilters.startDate, "MMM dd, yyyy") : "Pick Date"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {/* End Date */}
                  <View style={{ flex: 1 }}>
                    <Text className="text-muted text-[10px] font-bold uppercase mb-1">End Date</Text>
                    {Platform.OS === 'web' ? (
                      <input
                        type="date"
                        value={exportFilters.endDate ? format(exportFilters.endDate, 'yyyy-MM-dd') : ''}
                        style={{
                          width: '100%', height: 44, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                          padding: '0 12px', color: exportFilters.endDate ? '#fff' : 'rgba(255,255,255,0.35)',
                          fontSize: 14, cursor: 'pointer', outline: 'none',
                          colorScheme: 'dark', boxSizing: 'border-box', fontFamily: 'inherit',
                        } as React.CSSProperties}
                        onChange={(e) => {
                          const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : null;
                          if (d) setExportFilters(p => ({ ...p, endDate: d }));
                        }}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => setShowDatePicker('end')}
                        className="bg-background/50 border border-border rounded-2xl p-3"
                      >
                        <Text className="text-white font-bold">{exportFilters.endDate ? format(exportFilters.endDate, "MMM dd, yyyy") : "Pick Date"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Status Filter (Only for Leads) */}
              {exportModal.type === 'leads' && (
                <View className="mt-6">
                  <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-1">Status Restriction</Text>
                  <View className="flex-row flex-wrap">
                    {['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setExportFilters(p => ({ ...p, status: exportFilters.status === s ? "" : s }))}
                        className={`px-4 py-2 rounded-full border mr-2 mb-2 ${exportFilters.status === s ? 'bg-primary border-primary' : 'border-border bg-white/5'}`}
                      >
                        <Text className={`text-xs font-bold ${exportFilters.status === s ? 'text-white' : 'text-muted'}`}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Type Filter (Only for Warehouse Transactions) */}
              {exportModal.type === 'warehouse/transactions' && (
                <View className="mt-6">
                  <Text className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-1">Log Category</Text>
                  <View className="flex-row flex-wrap">
                    {['SALE', 'RESTOCK', 'INITIAL_STOCK', 'ADJUSTMENT'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setExportFilters(p => ({ ...p, type: exportFilters.type === t ? "" : t }))}
                        className={`px-4 py-2 rounded-full border mr-2 mb-2 ${exportFilters.type === t ? 'bg-amber-500 border-amber-500' : 'border-border bg-white/5'}`}
                      >
                        <Text className={`text-xs font-bold ${exportFilters.type === t ? 'text-white' : 'text-muted'}`}>{t.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row mt-12">
              <TouchableOpacity
                onPress={() => setExportFilters(getInitialFilters())}
                className="flex-1 h-16 bg-white/5 border border-white/10 rounded-3xl items-center justify-center mr-3"
              >
                <Text className="text-muted font-bold">Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExport}
                disabled={exporting}
                className="flex-2 h-16 bg-primary rounded-3xl items-center justify-center flex-row px-8"
              >
                {exporting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Download size={20} color="white" />
                    <Text className="text-white font-black ml-2 text-lg">Generate Excel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {Platform.OS !== 'web' && showDatePicker && (
          <DateTimePicker
            value={(showDatePicker === 'start' ? exportFilters.startDate : exportFilters.endDate) || new Date()}
            mode="date"
            display="default"
            onChange={(e, date) => {
              setShowDatePicker(null);
              if (date) setExportFilters(p => ({ ...p, [showDatePicker === 'start' ? 'startDate' : 'endDate']: date }));
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}
