import { useState, useEffect, useCallback } from "react";
import { message } from "antd";
import api from "../api";
import { getErrorMessage } from "./helpers";

const usePaged = (url, params = {}, limit = 10) => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(params);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(url, { params: { ...JSON.parse(key), page, limit } })
      .then((response) => {
        setData(response.data.items);
        setTotal(response.data.total);
      })
      .catch((error) => message.error(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [url, key, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [key]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  return { data, total, page, limit, loading, setPage, refresh: load };
};

export default usePaged;
