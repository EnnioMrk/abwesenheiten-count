import { WebUntisQR } from 'webuntis';
import { URL } from 'url';
import { authenticator as Authenticator } from 'otplib';

// The result of the scanned QR Code
const QRCodeData =
    'untis://setschool?url=perseus.webuntis.com&school=Gymnasium im Schloss&user=2019011610485630&key=DHA6CUFNXKEC5TN6&schoolNumber=2278200';

const untis = new WebUntisQR(QRCodeData, 'custom-identity', Authenticator, URL);

await untis.login();
