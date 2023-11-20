'use client'
import Image from 'next/image'
import styles from './page.module.scss'
import {useEffect, useRef, useState} from "react";
import * as echarts from 'echarts';


const PERIOD = 21
const BOOK_SIZE = 20000
const SLIP = 1
const SYMBOL = "ETH"

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


export default function Home() {
  const chartRef1 = useRef<any>(null)
  const chartRef2 = useRef<any>(null)
  const chartInstance1 = useRef<any>(null)
  const chartInstance2 = useRef<any>(null)
  const [kline, setKline] = useState([])
  const [tradeData, setTradeData] = useState<any[]>([])
  const [position, setPosition] = useState<any[]>([])
  const [pnl, setPnl] = useState<any[]>([])


  useEffect(() => {
    getKline()
  }, []);

  useEffect(() => {
    calculatePNL()
  }, [position]);


  useEffect(() => {
    if (tradeData.length) {
      console.log(tradeData[tradeData.length - 1]);
    }
  }, [tradeData]);

  useEffect(() => {
    var option = {
      title: {
        text: `PNL(${BOOK_SIZE} X5)`
      },
      xAxis: {type: 'category', gridIndex: 0, data: pnl.map(item => item.time)},
      yAxis: {type: 'value', gridIndex: 0},
      dataZoom: {type: 'slider'},
      series: [
        {type: 'line', symbol: "none", data: pnl.map(item => item.total)},
      ]
    };
    chartInstance2.current = echarts.init(chartRef2.current);
    chartInstance2.current.setOption(option);
  }, [pnl]);


  const calculatePNL = () => {
    console.log(position)
    const pnl = position.map((item, index) => {
      const prev = position[index - 1] || {}
      console.log(prev)
      if (prev.vol) {
        return {time: item.time, pnl: prev.vol * (item.price - prev.price)}
      } else {
        return {time: item.time, pnl: 0}
      }
    })

    let total = 0
    const totalPnl = pnl.map((item) => {
      total += item.pnl
      return {...item, total}
    })
    console.log(totalPnl)
    setPnl(totalPnl)
  }

  const makeTrading = (data: any) => {
    const positionList: any[] = []
    const total = BOOK_SIZE * 5
    let currentPosition = 0

    const result = data.map((item: any, index: number) => {
      if ((item.price) > item.bt) {
        const next = data[index - 1]
        if (next && next.price < next.bt) {
          if (currentPosition === 0) {
            currentPosition = total / item.price
            positionList.push({time: item.time, price: item.price, vol: currentPosition})
            return {...item, action: "BUY"}
          }
        }
      }

      if ((item.price) < item.up) {
        const next = data[index - 1]
        if (next && next.price > next.up) {
          if (currentPosition !== 0) {
            currentPosition = 0
            positionList.push({time: item.time, price: item.price, vol: currentPosition})
            return {...item, action: "SELL"}
          }
        }
      }

      positionList.push({time: item.time, price: item.price, vol: currentPosition})
      return item
    })

    setPosition(positionList)
    return result
  }


  useEffect(() => {
    if (kline.length > 0) {
      const defaultChart: any = {
        title: {
          text: `Kline-${SYMBOL}`
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
            return Math.floor((value.min * 0.9));
          },
          max: function (value: any) {
            return Math.ceil((value.max * 1.1));
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
      // console.log(66666666, actionList);

      defaultChart.series = [
        {
          type: 'candlestick',
          data: renderData,
          markPoint: {
            data: actionList.map((item: any, index: number) => {
              if (item.action === "BUY") {
                return {
                  coord: [index, item.price * 0.8],
                  symbol: "arrow",
                  symbolSize: 24,
                  label: {
                    formatter: "B",
                  },
                  itemStyle: {
                    color: "red"
                  }
                }
              } else if (item.action === "SELL") {
                return {
                  coord: [index, item.price * 1.2],
                  symbol: "arrow",
                  symbolSize: 24,
                  symbolRotate:180,
                  label: {
                    formatter: "S",
                  },
                  itemStyle: {
                    color: "green"
                  }
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
      chartInstance1.current = echarts.init(chartRef1.current);
      chartInstance1.current.setOption(defaultChart);
    }
  }, [kline]);

  const getKline = async () => {
    const data = await fetch(`https://api.binance.com/api/v3/klines?symbol=${SYMBOL}USDT&interval=1d&limit=1000`).then(res => res.json())
    console.log(data.length);
    setKline(data)
  }


  return (
    <main className={styles.main}>
      <div ref={chartRef1} style={{height: 500, width: "100%"}}/>
      <div ref={chartRef2} style={{height: 400, width: "100%"}}/>
    </main>
  )
}
