import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { Colors } from "../constants/Colors";
import { Activity, Cpu, Database, HardDrive, RefreshCcw, ShieldCheck, Clock, Server } from "lucide-react-native";
import React from "react";

interface HealthData {
  status: string;
  timestamp: string;
  process: {
    uptime: string;
    version: string;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    }
  };
  system: {
    platform: string;
    arch: string;
    uptime: string;
    totalMem: string;
    freeMem: string;
    memUsagePercent: string;
    cpuCount: number;
    cpuModel: string;
    loadAvg: number[];
  };
  database: string;
}

const MetricCard = ({ title, value, icon: Icon, color, subtitle }: { title: string, value: string, icon: any, color: string, subtitle?: string }) => (
  <View className="bg-card border border-border p-6 rounded-[32px] mb-4 flex-1 min-w-[300px]">
    <View className="flex-row justify-between items-start mb-4">
      <View className="p-3 rounded-2xl" style={{ backgroundColor: `${color}15` }}>
        <Icon size={24} color={color} />
      </View>
      {subtitle && <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{subtitle}</Text>}
    </View>
    <Text className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">{title}</Text>
    <Text className="text-white text-2xl font-black">{value}</Text>
  </View>
);

export default function HealthMonitor() {
  const { width } = useWindowDimensions();
  const isLargeDevice = width > 768;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get("/health");
      return response.data.data as HealthData;
    },
    refetchInterval: 10000, // Auto refresh every 10s
  });

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text className="text-muted-foreground mt-4 font-bold uppercase tracking-widest">Collecting Metrics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} progressBackgroundColor={Colors.card} />
        }
      >
        <View className="flex-row justify-between items-end mb-10">
          <View>
            <Text className="text-primary font-medium tracking-widest uppercase mb-2">System Performance</Text>
            <Text className="text-white text-5xl font-extrabold tracking-tight">Health</Text>
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-card p-4 rounded-2xl border border-border"
          >
            <RefreshCcw size={20} color={isRefetching ? Colors.muted : Colors.primary} />
          </TouchableOpacity>
        </View>

        {data && (
          <View>
            {/* Status Overview */}
            <View className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px] mb-8 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="bg-emerald-500 p-3 rounded-full mr-4">
                  <ShieldCheck size={24} color="white" />
                </View>
                <View>
                  <Text className="text-emerald-500 font-black text-xl">SYSTEM OPERATIONAL</Text>
                  <Text className="text-emerald-500/60 text-xs font-bold uppercase">All services responding normally</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-white font-bold">{data.status}</Text>
                <Text className="text-muted-foreground text-[10px]">VER {data.process.version}</Text>
              </View>
            </View>

            {/* Grid Metrics */}
            <View className="flex-row flex-wrap gap-4">
              <MetricCard
                title="Node Process Uptime"
                value={data.process.uptime}
                icon={Clock}
                color="#3b82f6"
                subtitle="Active Session"
              />
              <MetricCard
                title="System Uptime"
                value={data.system.uptime}
                icon={Server}
                color="#8b5cf6"
                subtitle={data.system.platform}
              />
              <MetricCard
                title="Database Status"
                value={data.database}
                icon={Database}
                color="#10b981"
                subtitle="MySQL 8.0"
              />
              <MetricCard
                title="Memory Usage"
                value={`${data.system.memUsagePercent}%`}
                icon={HardDrive}
                color="#f59e0b"
                subtitle={`${data.system.freeMem} Free`}
              />
              <MetricCard
                title="CPU Load"
                value={data.system.loadAvg[0].toFixed(2)}
                icon={Cpu}
                color="#ef4444"
                subtitle={`${data.system.cpuCount} Cores`}
              />
              <MetricCard
                title="Heap Used"
                value={data.process.memory.heapUsed}
                icon={Activity}
                color="#ec4899"
                subtitle={`Total: ${data.process.memory.heapTotal}`}
              />
            </View>

            {/* Detailed Stats */}
            <View className="mt-8 bg-card border border-border rounded-[40px] p-8">
              <Text className="text-white text-xl font-bold mb-6">Detailed Environment</Text>

              <View className="space-y-4">
                {[
                  { label: "Architecture", value: data.system.arch },
                  { label: "CPU Model", value: data.system.cpuModel },
                  { label: "Total RAM", value: data.system.totalMem },
                  { label: "Process RSS", value: data.process.memory.rss },
                  { label: "External Mem", value: data.process.memory.external },
                  { label: "Report Time", value: new Date(data.timestamp).toLocaleTimeString() },
                ].map((item, i) => (
                  <View key={i} className="flex-row justify-between items-start py-3 border-b border-border/50">
                    <Text className="text-muted-foreground font-medium mr-4 flex-1">{item.label}</Text>
                    <View className="flex-[2] items-end">
                      <Text className="text-white font-bold text-right">{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
