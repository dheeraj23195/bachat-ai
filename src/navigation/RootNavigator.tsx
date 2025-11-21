import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppTabs from "./AppTabs";

import WelcomeScreen from "../screens/Auth/WelcomeScreen";
import SignInScreen from "../screens/Auth/SignInScreen";
import SignUpScreen from "../screens/Auth/SignUpScreen";

import AlertsScreen from "../screens/Alerts/AlertsScreen";
import ImportTransactionsScreen from "../screens/Import/ImportTransactionsScreen";
import ProfileScreen from "../screens/Profile/ProfileScreen";
import ChatbotScreen from "../screens/Chatbot/ChatbotScreen";
import AddBudgetScreen from "../screens/Budget/AddBudgetScreen";
import EditBudgetCategoryScreen from '../screens/Budget/EditBudgetCategoryScreen';
import TransactionsListScreen from '../screens/Transactions/TransactionsListScreen';
import EditExpenseScreen from '../screens/Add/EditExpenseScreen';
import CategoryManagementScreen from '../screens/Categories/CategoryManagementScreen';
import AboutScreen from "../screens/About/AboutScreen";
import OnboardingScreen from "../screens/Onboarding/OnboardingScreen";
import ForgotPinScreen from "../screens/Security/ForgotPinScreen";
import LockScreen from "../screens/Security/LockScreen";
import { AppState } from "react-native";
import { hasPin } from "../lib/pin";
import { useNavigationContainerRef } from "@react-navigation/native";
import { useEffect } from "react";


export type RootStackParamList = {
  AppTabs: undefined;

  // Auth
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;

  // Standalone screens
  Alerts: undefined;
  ImportTransactions: undefined;
  Profile: undefined;
  Chatbot: undefined;
  AddBudget: undefined;
  About: undefined;
  TransactionsList: {
    categoryId: string | null;
    title: string;
    startDate?: string; // ISO string
    endDate?: string;   // ISO string
  };

  EditBudgetCategory: { budgetId: string };
  EditExpense: { transactionId: string };
  CategoryManagement: undefined;
  Onboarding: undefined
  ForgotPin: undefined;
  Lock: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      // Navigator might not be ready yet on cold start
      if (!navigationRef.isReady()) {
        return;
      }

      (async () => {
        const pinExists = await hasPin();
        const currentRoute = navigationRef.getCurrentRoute()?.name;

        if (pinExists && currentRoute !== "Lock") {
          navigationRef.reset({
            index: 0,
            routes: [{ name: "Lock" }],
          });
        }
      })();
    }
  });

  return () => subscription.remove();
}, []);


  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      {/* Tab navigation */}
      <Stack.Screen name="AppTabs" component={AppTabs} />

      {/* Auth */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />

      {/* Standalone */}
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen
        name="ImportTransactions"
        component={ImportTransactionsScreen}
      />
      <Stack.Screen
        name="AddBudget"
        component={AddBudgetScreen}
        options={{ headerShown: false }} // or whatever you like
      />
      <Stack.Screen
        name="CategoryManagement"
        component={CategoryManagementScreen}
        options={{ title: "Manage categories" }}
      />

      <Stack.Screen
        name="TransactionsList"
        component={TransactionsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditExpense"
        component={EditExpenseScreen}
        options={{ title: "Edit Expense" }}
      />
      <Stack.Screen
        name="EditBudgetCategory"
        component={EditBudgetCategoryScreen}
        options={{ title: "Edit Budget" }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
      <Stack.Screen name="Lock" component={LockScreen} />

    </Stack.Navigator>
  );
};

export default RootNavigator;
