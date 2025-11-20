import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import colors from "../lib/colors";

import HomeScreen from "../screens/Home/HomeScreen";
import BudgetScreen from "../screens/Budget/BudgetScreen";
import AddExpenseScreen from "../screens/Add/AddExpenseScreen";
import InsightsScreen from "../screens/Insights/InsightsScreen";
import SettingsScreen from "../screens/Settings/SettingsScreen";

import { Home, Wallet, Plus, BarChart3, Settings } from "lucide-react-native";

export type AppTabParamList = {
  Home: undefined;
  Budget: undefined;
  Add: undefined;
  Insights: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const AppTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarShowLabel: true,

        // 🔥 Increased height for better spacing
        tabBarStyle: {
          height: 90,
          paddingBottom: 12,
          paddingTop: 12,
        },

        tabBarLabelStyle: {
          marginTop: 6, // 🔥 More spacing between icon and text
          fontSize: 12,
        },

        tabBarIcon: ({ focused }) => {
          let IconComponent;

          switch (route.name) {
            case "Home":
              IconComponent = Home;
              break;
            case "Budget":
              IconComponent = Wallet;
              break;
            case "Add":
              IconComponent = Plus;
              break;
            case "Insights":
              IconComponent = BarChart3;
              break;
            case "Settings":
              IconComponent = Settings;
              break;
          }

          // Special case: ADD tab → no highlight shape
          if (route.name === "Add") {
            return (
              <View style={styles.addIconWrapper}>
                <IconComponent size={26} color={colors.primary} />
              </View>
            );
          }

          return (
            <View
              style={[
                styles.iconHighlightWrapper,
                focused && styles.iconHighlightActive,
              ]}
            >
              <IconComponent
                size={22}
                color={focused ? "#FFFFFF" : "#6B7280"}
              />
            </View>
          );
        },

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#6B7280",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Add" component={AddExpenseScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // 🔵 Highlight shape for selected icons
  iconHighlightWrapper: {
    width: 44,
    height: 44,
    borderRadius: 18, // 🔥 Rounded square instead of circle
    justifyContent: "center",
    alignItems: "center",
  },
  iconHighlightActive: {
    backgroundColor: colors.primary,
  },

  // ➕ ADD button style (no highlight)
  addIconWrapper: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AppTabs;