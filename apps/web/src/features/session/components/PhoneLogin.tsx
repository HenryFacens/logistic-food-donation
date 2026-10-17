import { useId, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { Button, Card } from '../../../shared/ui'
import { useRequestLoginCode, useVerifyLoginCode } from '../api/phoneLogin'
import { sessionMessages } from '../messages'
import type { SessionIdentity } from '../model/session'

interface PhoneLoginProps {
  apiClient: ApiClient
  onSignedIn(identity: SessionIdentity): void
}

const inputClass =
  'min-h-12 rounded-control border border-border bg-surface px-3 text-lg font-normal tracking-wide'

export function PhoneLogin({ apiClient, onSignedIn }: PhoneLoginProps) {
  const phoneId = useId()
  const codeId = useId()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const requestCode = useRequestLoginCode(apiClient)
  const verifyCode = useVerifyLoginCode(apiClient)
  const codeSent = requestCode.isSuccess
  const error = requestCode.error || verifyCode.error

  return (
    <Card className="grid max-w-md gap-4">
      <div>
        <span className="eyebrow">{sessionMessages.phoneEyebrow}</span>
        <h2 className="mb-1 text-xl font-extrabold">{sessionMessages.phoneTitle}</h2>
        <p className="mb-0 text-sm">
          {codeSent ? sessionMessages.codeSent : sessionMessages.phoneDescription}
        </p>
      </div>

      {!codeSent ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            requestCode.mutate(phone)
          }}
        >
          <label className="grid gap-2 font-bold" htmlFor={phoneId}>
            {sessionMessages.phoneLabel}
            <input
              autoComplete="tel-national"
              className={inputClass}
              id={phoneId}
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(19) 99999-0001"
              required
              type="tel"
              value={phone}
            />
          </label>
          <Button
            disabled={requestCode.isPending || phone.replace(/\D/g, '').length < 10}
            type="submit"
            variant="primary"
          >
            {requestCode.isPending ? sessionMessages.sending : sessionMessages.sendCode}
          </Button>
        </form>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            verifyCode.mutate(
              { code, phone },
              {
                onSuccess(session) {
                  onSignedIn({
                    demoKey: session.user.demoKey,
                    displayName: session.user.displayName,
                    role: session.user.role,
                    token: session.token,
                  })
                },
              },
            )
          }}
        >
          <label className="grid gap-2 font-bold" htmlFor={codeId}>
            {sessionMessages.codeLabel}
            <input
              autoComplete="one-time-code"
              className={`${inputClass} text-center text-2xl`}
              id={codeId}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              pattern="\d{6}"
              required
              value={code}
            />
          </label>
          {requestCode.data?.devCode ? (
            <p className="mb-0 rounded-control border border-warning/30 bg-warning/10 p-2 text-sm">
              {sessionMessages.devCode} <strong>{requestCode.data.devCode}</strong>
            </p>
          ) : null}
          <Button
            disabled={verifyCode.isPending || code.length !== 6}
            type="submit"
            variant="primary"
          >
            {verifyCode.isPending ? sessionMessages.verifying : sessionMessages.signIn}
          </Button>
          <Button
            onClick={() => {
              requestCode.reset()
              verifyCode.reset()
              setCode('')
            }}
            variant="ghost"
          >
            {sessionMessages.changePhone}
          </Button>
        </form>
      )}

      {error ? (
        <div
          className="rounded-control border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {error.message}
        </div>
      ) : null}
    </Card>
  )
}
