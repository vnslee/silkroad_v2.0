// FC-4: RulesetForm — 합≠100 시 [저장] 비활성.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RulesetForm from '../components/ruleset/RulesetForm'

describe('RulesetForm', () => {
  it('초기(합 100)에는 저장 버튼 활성', () => {
    render(<RulesetForm />)
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toBeEnabled()
  })

  it('3개 패널 legend가 렌더된다', () => {
    render(<RulesetForm />)
    expect(screen.getByText(/카테고리 가중치/)).toBeInTheDocument()
    expect(screen.getByText(/임계값 계수/)).toBeInTheDocument()
    expect(screen.getByText(/출처 신뢰 계수/)).toBeInTheDocument()
  })
})
