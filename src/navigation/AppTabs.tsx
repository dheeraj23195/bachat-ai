import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/Home/HomeScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import AddExpenseScreen from '../screens/Add/AddExpenseScreen';
import InsightsScreen from '../screens/Insights/InsightsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

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
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Add" component={AddExpenseScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default AppTabs;
