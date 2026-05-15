import { Stack, Tabs, usePathname, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LayoutDashboard, Users, ShoppingBag, Warehouse, LogOut, History, ShieldOff, Activity } from "lucide-react-native";
import { Colors } from "../constants/Colors";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Toast from 'react-native-toast-message';
import "../global.css";

const queryClient = new QueryClient();


const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "sales", "warehouse"] },
  { name: "CRM", href: "/crm", icon: Users, roles: ["admin", "sales"] },
  { name: "Sales", href: "/sales", icon: ShoppingBag, roles: ["admin", "sales"] },
  { name: "Warehouse", href: "/warehouse", icon: Warehouse, roles: ["admin", "warehouse"] },
  { name: "Logs", href: "/transactions", icon: History, roles: ["admin"] },
  { name: "Health", href: "/health", icon: Activity, roles: ["admin"] },
];

function AccessDenied({ route }: { route: string }) {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <View className="bg-red-500/10 p-6 rounded-[32px] border border-red-500/20 items-center mb-8">
        <ShieldOff size={48} color="#ef4444" />
      </View>
      <Text className="text-white text-3xl font-black mb-3 text-center">Access Denied</Text>
      <Text className="text-muted text-center text-base leading-6 mb-2">
        You don't have permission to access{" "}
        <Text className="text-white font-bold capitalize">{route}</Text>.
      </Text>
      <Text className="text-red-400 text-sm text-center mb-10 font-medium">
        Insufficient permissions for your role.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace("/")}
        className="bg-primary px-10 py-4 rounded-2xl shadow-xl shadow-primary/30"
      >
        <Text className="text-white font-bold text-base">Go to Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}



function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  return (
    <View className="w-64 bg-card border-r border-border p-6 hidden md:flex h-full">


      <View className="mb-10">
        <Text className="text-white text-2xl font-bold italic">Meetel ERP</Text>
      </View>
      <View className="flex-1 space-y-2">
        {NAV_ITEMS.filter(item => item.roles.includes(user?.role?.toLowerCase() || "")).map((item) => {

          const isActive = pathname === item.href;

          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => router.push(item.href as any)}
              className={`flex-row items-center p-3 rounded-xl ${
                isActive ? "bg-primary shadow-lg shadow-primary/30" : "hover:bg-white/5"
              }`}
            >
              <item.icon size={20} color={isActive ? "white" : Colors.muted} />


              <Text
                className={`ml-3 font-medium ${
                  isActive ? "text-white" : "text-slate-400"
                }`}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User Info & Logout */}
      <View className="border-t border-border pt-6 mt-6">
        <View className="mb-6 px-3">
          <Text className="text-white font-bold">{user?.name || "User"}</Text>
          <Text className="text-muted-foreground text-xs uppercase tracking-tighter mt-1">{user?.role || "Guest"}</Text>
        </View>
        <TouchableOpacity
          onPress={() => logout()}
          className="flex-row items-center p-3 rounded-xl hover:bg-red-500/10"
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="ml-3 font-medium text-red-500">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavWrapper() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { isLoading, user } = useAuth();

  const isDesktop = width >= 768;

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-white mb-4">Initializing...</Text>
      </View>
    );
  }

  // Derive the top-level route segment (e.g. "warehouse" from "/warehouse")
  const currentRoute = pathname.split("/").filter(Boolean)[0] ?? "";
  // allowedRoutes comes from the server at login — no hardcoded list on the client
  const isUnauthorized =
    user &&
    currentRoute !== "" &&
    !(user.allowedRoutes ?? []).includes(currentRoute);

  if (isDesktop) {
    const isLogin = pathname === "/login";
    return (
      <View className="flex-1 flex-row bg-background">
        {!isLogin && <Sidebar />}
        <View className="flex-1">
          {isUnauthorized ? (
            <AccessDenied route={currentRoute} />
          ) : (
            <Stack screenOptions={{ headerShown: false }} />
          )}
        </View>
      </View>
    );
  }

  // Mobile Bottom Tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 90 : 70,
          // Hide tab bar on login screen
          display: pathname === '/login' ? 'none' : 'flex',
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          href: user?.role ? "/" : null,
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: "CRM",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          href: ["admin", "sales"].includes(user?.role?.toLowerCase() || "") ? "/crm" : null,

        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
          href: ["admin", "sales"].includes(user?.role?.toLowerCase() || "") ? "/sales" : null,

        }}
      />

      <Tabs.Screen
        name="warehouse"
        options={{
          title: "Warehouse",
          tabBarIcon: ({ color, size }) => <Warehouse size={size} color={color} />,
          href: ["admin", "warehouse"].includes(user?.role?.toLowerCase() || "") ? "/warehouse" : null,

        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Logs",
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          href: user?.role?.toLowerCase() === "admin" ? "/transactions" : null,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: "Health",
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
          href: user?.role?.toLowerCase() === "admin" ? "/health" : null,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}


export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavWrapper />
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}


