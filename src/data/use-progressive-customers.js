import { useEffect, useMemo, useRef, useState } from 'react'

const INITIAL_COUNT = 15
const INSERT_INTERVAL = 750

function initialDisplay(key, customers) {
  return { key, ids: customers.slice(0, INITIAL_COUNT).map((customer) => customer.id), seeded: customers.length > 0 }
}

// 每次进入页面或更换筛选，先展示 15 条；库存数据与实时推送共用插入动效。
export function useProgressiveCustomers(customers, filterKey, enabled, onInsert) {
  const [display, setDisplay] = useState(() => initialDisplay(filterKey, customers))
  const active = display.key === filterKey && (display.seeded || !customers.length)
    ? display
    : initialDisplay(filterKey, customers)
  const latest = useRef({})
  latest.current = { customers, filterKey, onInsert }

  useEffect(() => {
    setDisplay((previous) => {
      if (previous.key !== filterKey || (!previous.seeded && customers.length)) {
        return initialDisplay(filterKey, customers)
      }
      return previous
    })
  }, [customers, filterKey])

  useEffect(() => {
    if (!enabled) return
    const timer = setInterval(() => {
      const current = latest.current
      if (current.filterKey !== filterKey) return
      const shown = new Set(current.ids)
      const next = current.customers.find((customer) => !shown.has(customer.id))
      if (!next) return
      setDisplay((previous) => ({
        key: filterKey,
        ids: [next.id, ...(previous.key === filterKey ? previous.ids : current.ids)].filter((id, index, ids) => ids.indexOf(id) === index),
        seeded: true
      }))
      current.onInsert(next)
    }, INSERT_INTERVAL)
    return () => clearInterval(timer)
  }, [filterKey, enabled])

  latest.current.ids = active.ids

  const visibleCustomers = useMemo(() => {
    const byId = new Map(customers.map((customer) => [customer.id, customer]))
    return active.ids.map((id) => byId.get(id)).filter(Boolean)
  }, [customers, active.ids])

  // 真正的新推送立即展示，不用等待历史数据队列，也不会重复插入。
  const revealCustomer = (customer) => {
    const current = latest.current
    setDisplay((previous) => {
      const ids = previous.key === current.filterKey ? previous.ids : current.ids
      if (ids.includes(customer.id)) return previous
      return { key: current.filterKey, ids: [customer.id, ...ids], seeded: true }
    })
  }

  return {
    visibleCustomers,
    revealCustomer,
    hasPending: visibleCustomers.length < customers.length
  }
}
