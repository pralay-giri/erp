import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/Api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to inject x-user-id and Authorization token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error in axios interceptor", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
