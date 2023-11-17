'use client'
import Image from 'next/image'
import styles from './page.module.scss'
import {useEffect, useRef, useState} from "react";
import * as echarts from 'echarts';

const calculateMovingAverage = (data: number[], period: number) => {
  const movingAverages: (null | number) [] = [];
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

const PERIOD = 21

export default function Home() {
  const chartRef = useRef<any>(null)
  const chartInstance = useRef<any>(null)
  const [kline, setKline] = useState([])
  const [tradeData, setTradeData] = useState<any[]>([])

  useEffect(() => {
    getKline()
  }, []);


  useEffect(() => {
    if (tradeData.length) {
      console.log(tradeData[tradeData.length - 1]);
    }
  }, [tradeData]);


  const makeTrading = (data: any) => {
    return data.map((item: any) => {
      if (Number(item.price) < item.bt) {
        console.log(item.time, item.price)
        return {...item, action: "buy"}
      } else {
        return item
      }
    })
  }


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

      const timeData = kline.map(item => {
        const date = new Date(item[0])
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      }).slice(PERIOD - 1)

      defaultChart.xAxis.data = timeData


      const ma20 = calculateMovingAverage(kline.map(item => Number(item[4])), PERIOD)?.slice(PERIOD)

      console.log(ma20?.length);

      const std = ma20.map((item, index) => {
        return Math.sqrt(kline.slice(index, index + PERIOD).reduce((acc: number, current: any, index: number) => {

          const diff = Number(current[4]) - (item as number)
          const value = diff * diff
          return acc + value
        }, 0) / PERIOD)
      })

      // console.log(std.length)
      const renderData = kline.map(item => [item[1], item[4], item[2], item[3]]).slice(PERIOD - 1)
      const upLine = ma20.map((item, index) => item as number + 2 * std[index])
      const btLine = ma20.map((item, index) => item as number - 2 * std[index])

      const tradeData = renderData.map((xxx, index) => {
        return {
          time: timeData[index],
          price: Number(xxx[1]),
          up: upLine[index],
          bt: btLine[index]
        }
      })

      setTradeData(tradeData)


      const actionList = makeTrading(tradeData)
      console.log(66666666, actionList);

      defaultChart.series = [
        {
          type: 'candlestick',
          data: renderData,
          markPoint: {
            data: actionList.map((item: any, index: number) => {
              if (item.action) {
                return {
                  coord: [index, item.price * 0.8],
                  symbol: "arrow",
                  symbolSize: 30
                }
              } else {
                return null
              }
            }).filter((item) => !!item)
          },
        },
        {
          type: "line",
          data: ma20,
          symbol: "none"
        },
        {
          type: "line",
          data: upLine,
          symbol: "none"
        },
        {
          type: "line",
          data: btLine,
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
      <div ref={chartRef} style={{height: 700, width: "100%"}}/>
    </main>
  )
}
