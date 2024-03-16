const conexao = require('./mysql')
const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb25uZWN0aW9uS2V5Ijoidy1hcGlfTVlRWDZOQ0FOTiIsImlhdCI6MTcwNjcyNzk0NX0.EmwN8ix3m7daeB_lnvIIexmZaKSBbeT8MeqMkZ9ppeI'
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

//Data Atual
const moment = require('moment');
moment.locale('pt-br');

var localTime = moment().format('YYYY-MM-DD'); // store localTime
var dayjs().format('DD/MM/YYYY - HH:mm:ss') = moment().format('LLL')

//Data de amanhã
let d = new Date();

// Adicionando um dia a mais 
d.setDate(d.getDate() + 1);

let year = d.getFullYear()
let month = String(d.getMonth() + 1)
let day = String(d.getDate())

// Adding leading 0 if the day or month
// is one digit value
month = month.length == 1 ?
  month.padStart('2', '0') : month;

day = day.length == 1 ?
  day.padStart('2', '0') : day;

// Data atual
const tomorrow = `${day}/${month}/${year}`;

// Rotina Cron Job para lembrar que o cliente possui um agendamento marcado para a data de amanhã (Enviado todo dia às 19h00)
var tomorrowsAppointments = `SELECT * FROM wp_latepoint_reminders WHERE date = "${tomorrow}" AND active = "yes" AND sent = "no";`

conexao.query(tomorrowsAppointments, function (err, result) {
    if (err) throw err;

    var numbers = []
    var bookingCodes = []

    result.forEach(booking => {
        numbers.push(booking.phone)
        bookingCodes.push(booking.booking_code)
    });

    axios.post('https://host05.serverapi.dev/message/sendTextMany?connectionKey=w-api_MYQX6NCANN',
        {
            numbers, message: {
                text: `*⚠️ ATENÇÃO ⚠️*
  Boa noite, tudo bem? Estamos passando para te lembrar que amanhã é o seu agendamento, ok? 
      
  Para mais informações referente ao seu agendamento consulte nossas mensagens anteriores ou acesse nosso site ZezinhosBarbearia.com.br e logue em sua conta.
      `}, delayMessage: 15000
        })
        .then(() => console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Cron Jobs dos lembretes enviados: ${bookingCodes}`))
        .catch((error) => console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Ops, erro ao enviar a notificação Cron dos Lembretes. ${error.message}`))

})