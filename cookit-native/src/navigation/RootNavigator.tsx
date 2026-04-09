import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { RecipeScreen } from '../screens/RecipeScreen';

export type RootStackParamList = {
  Home: undefined;
  Recipe: { recipeUrl: string, recipeData?: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left', // Good for RTL
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Recipe" component={RecipeScreen} />
    </Stack.Navigator>
  );
};
