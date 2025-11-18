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
import EditBudgetScreen from '../screens/Budget/EditBudgetScreen';
import TransactionsListScreen from '../screens/Transactions/TransactionsListScreen';

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
  TransactionsList: {
    categoryId?: string | null;
    title?: string;
  };
  EditBudget: {
    budgetId: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
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
        name="TransactionsList"
        component={TransactionsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditBudget"
        component={EditBudgetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chatbot" component={ChatbotScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
