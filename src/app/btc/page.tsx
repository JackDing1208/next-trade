'use client'
import Image from 'next/image'
import styles from './page.module.scss'
import {useEffect, useRef, useState} from "react";
import * as echarts from 'echarts';

const calculateMovingAverage = (data: number[], period: number) => {
  const movingAverages = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      movingAverages.push(null);
    } else {
      const slice = data.slice(i - period, i);
      const sum = slice.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      const average = sum / period;
      movingAverages.push(average);
    }
  }
  return movingAverages;
}

const PERIOD = 20

export default function Home() {
  const chartRef = useRef<any>(null)
  const chartInstance = useRef<any>(null)
  const [kline, setKline] = useState([])

  useEffect(() => {
    getKline()
  }, []);

  useEffect(() => {
    if (kline.length > 0) {
      chartInstance.current = echarts.init(chartRef.current);
      const defaultChart: any = {
        legend: {
          name: [],
        },
        tooltip: {
          trigger: 'axis',
          position: function (pt: any) {
            return [pt[0], '10%'];
          },
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          min: function (value: any) {
            return Math.floor((value.min - (value.max - value.min) * 0.1) / 5000) * 5000;
          },
          max: function (value: any) {
            return Math.ceil((value.max + (value.max - value.min) * 0.1) / 5000) * 5000;
          },
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100,
          },
          {
            start: 0,
            end: 100,
          },
        ],
        series: [],
      };
      defaultChart.xAxis.data = kline.map(item => {
        const date = new Date(item[0])
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      }).slice(PERIOD)


      const ma20 = calculateMovingAverage(kline.map(item => Number(item[4])), PERIOD)?.slice(PERIOD)

      console.log(ma20?.length);

      const std = ma20.map((item, index) => {
        return Math.sqrt(kline.slice(index, index + PERIOD).reduce((acc: number, current: any, index: number) => {

          const diff = Number(current[4]) - (item as number)
          const value = diff * diff
          return acc + value
        }, 0) / PERIOD)
      })


      defaultChart.series = [
        {
          type: 'candlestick',
          data: kline.map(item => [item[1], item[4], item[2], item[3]]).slice(20)
        },
        {
          type: "line",
          data: ma20,
          symbol: "none"
        },
        {
          type: "line",
          data: ma20.map((item, index) => item as number + 2 * std[index]),
          symbol: "none"
        },
        {
          type: "line",
          data: ma20.map((item, index) => item as number - 2 * std[index]),
          symbol: "none"
        }
      ]

      chartInstance.current.setOption(defaultChart);
    }
  }, [kline]);

  const getKline = async (symbol: string = "BTC") => {
    const data = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=1d`).then(res => res.json())
    console.log(data.length);
    setKline(data)
  }


  return (
    <main className={styles.main}>
      <div ref={chartRef} style={{height: 600, width: "100%"}}/>
    </main>
  )
}
