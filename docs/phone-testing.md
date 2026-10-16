# HTTPS phone acceptance

Camera, GPS, and PWA installation require a secure context on a physical phone.
The normal Compose stack remains HTTP-only for local development. Use this
temporary TLS proxy for acceptance testing on the same LAN.

## 1. Create a locally trusted certificate

Install `mkcert` on the development machine, then:

```bash
mkdir -p .certs
LAN_IP="$(hostname -I | awk '{print $1}')"
mkcert -cert-file .certs/resgata.pem \
  -key-file .certs/resgata-key.pem \
  localhost 127.0.0.1 "$LAN_IP"
```

Install the `mkcert` root CA on the test phone according to the phone operating
system. Do not copy the generated private key to the phone.

## 2. Start the HTTPS proxy

Keep the Resgata Compose stack running, then execute:

```bash
docker run --rm \
  --add-host host.docker.internal:host-gateway \
  -p 8443:8443 \
  -v "$PWD/infra/nginx/phone-https.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/.certs/resgata.pem:/etc/nginx/certs/resgata.pem:ro" \
  -v "$PWD/.certs/resgata-key.pem:/etc/nginx/certs/resgata-key.pem:ro" \
  nginx:1.29-alpine
```

Open `https://<LAN_IP>:8443/entrar` on the phone. Validate:

- PWA installation;
- seller camera/file capture;
- driver location permission and denial fallback;
- QR presentation and confirmation;
- offline donation publication followed by replay after reconnect.

The certificate must include the exact LAN IP used by the phone. Regenerate it
when the machine IP changes.
