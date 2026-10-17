import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BarFunnelChart } from './BarFunnelChart'
import { DonutChart } from './DonutChart'
import { EvidenceLegend } from './EvidenceLegend'
import { LineChart } from './LineChart'
import { MetricCard } from './MetricCard'
import { MonthlySeriesBars } from './MonthlySeriesBars'
import { formatDashboardMonth, formatDashboardValue } from './formatters'

describe('dashboard formatters', () => {
  it('formats dashboard units in pt-BR', () => {
    expect(formatDashboardValue(1234.5, 'BRL')).toContain('1.234,50')
    expect(formatDashboardValue(84.8, '%')).toBe('84,8%')
    expect(formatDashboardValue(1052.5, 'kg')).toBe('1.052,5 kg')
    expect(formatDashboardValue(12, 'min')).toBe('12 min')
    expect(formatDashboardValue(1, 'dias')).toBe('1 dia')
    expect(formatDashboardValue(2, 'days')).toBe('2 dias')
    expect(formatDashboardValue(23, 'contagem')).toBe('23')
    expect(formatDashboardValue(null, 'kg')).toBe('Não disponível')
    expect(formatDashboardMonth('2026-10')).toContain('2026')
  })
})

describe('dashboard accessibility content', () => {
  it('renders unavailable values and evidence as text', () => {
    const markup = renderToStaticMarkup(
      <MetricCard
        metric={{
          evidence: 'unavailable',
          key: 'fiscal-saving',
          label: 'Economia fiscal estimada',
          unit: 'BRL',
          value: null,
        }}
      />,
    )

    expect(markup).toContain('Economia fiscal estimada')
    expect(markup).toContain('Não disponível')
  })

  it('renders every evidence category with a textual label', () => {
    const markup = renderToStaticMarkup(<EvidenceLegend />)

    expect(markup).toContain('Registrado')
    expect(markup).toContain('Calculado')
    expect(markup).toContain('Estimado')
    expect(markup).toContain('Não disponível')
  })

  it('renders monthly values in addition to decorative bars', () => {
    const markup = renderToStaticMarkup(
      <MonthlySeriesBars
        series={{
          evidence: 'calculated',
          key: 'donated-weight',
          label: 'Kg doados',
          points: [
            { month: '2026-09', value: 120 },
            { month: '2026-10', value: null },
          ],
          unit: 'kg',
        }}
      />,
    )

    expect(markup).toContain('120 kg')
    expect(markup).toContain('Não disponível')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('renders a donut with a visible textual legend', () => {
    const markup = renderToStaticMarkup(
      <DonutChart
        ariaLabel="Distribuição das doações"
        centerLabel="concluído"
        centerValue="84%"
        data={[
          { label: 'Recebido', tone: 'success', value: 84 },
          { label: 'Pendente', tone: 'muted', value: 16 },
        ]}
        valueFormatter={(value) => `${value}%`}
      />,
    )

    expect(markup).toContain('aria-label="Distribuição das doações"')
    expect(markup).toContain('84%')
    expect(markup).toContain('Recebido')
    expect(markup).toContain('Pendente')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('renders a line curve and exposes every point as text', () => {
    const markup = renderToStaticMarkup(
      <LineChart
        ariaLabel="Doações nos últimos meses"
        data={[
          { label: 'Ago', value: 10 },
          { label: 'Set', value: 18 },
          { label: 'Out', value: 16 },
        ]}
      />,
    )

    expect(markup).toContain('aria-label="Doações nos últimos meses"')
    expect(markup).toContain('dashboard-line-chart__curve')
    expect(markup).toContain('Ago')
    expect(markup).toContain('18')
  })

  it('renders bars and funnel variants with visible labels and values', () => {
    const markup = renderToStaticMarkup(
      <BarFunnelChart
        ariaLabel="Funil de entregas"
        data={[
          { label: 'Aceitas', tone: 'primary', value: 40 },
          { label: 'Concluídas', tone: 'success', value: 38 },
        ]}
        variant="funnel"
      />,
    )

    expect(markup).toContain('aria-label="Funil de entregas"')
    expect(markup).toContain('data-variant="funnel"')
    expect(markup).toContain('Aceitas')
    expect(markup).toContain('Concluídas')
    expect(markup).toContain('40')
    expect(markup).toContain('38')
  })
})
