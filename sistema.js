const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser');
const dayjs = require('dayjs')

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const axios = require('axios');

const app = express()

const port = 3000

const server_start = dayjs().format('DD/MM/YYYY - HH:mm:ss')

//Configurações painel.w-api.app
const host = 'host01.serverapi.dev'
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb25uZWN0aW9uS2V5Ijoidy1hcGlfWUJVSko2WUVFNCIsImlhdCI6MTcwNzI2NTAwMX0.DXUMMl4qmnP0w_P9v8wML5JS5jdnJi3MkIDjGUfdGwQ'
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
const key = 'w-api_YBUJJ6YEE4'

//Cors
app.use(cors())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
  next();
});

//BodyParser
app.use(bodyParser.json({
  extended: true,
  limit: '100000kb',
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '100000kb',
}));

app.set('view engine', 'ejs');
app.set('views', './views');

//Data Atual
const moment = require('moment');
moment.locale('pt-br');

var localTime = moment().format('YYYY-MM-DD'); // store localTime

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

// MongoDB Conexão
mongoose.Promise = global.Promise
mongoose.connect('mongodb://127.0.0.1:27017/sistema_barbearia')
  .then(() => console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | MongoDB OK - Funcionando Corretamente.`));

//Model Reminders
const ReminderSchema = new Schema({
  id: ObjectId,
  booking_code: String,
  date: String,
  hour: String,
  phone: String,
  message: String,
  active: String,
  sent: String,
})

const Reminder = mongoose.model('Reminders', ReminderSchema);

//Rotas
app.get('/', (req, res) => {
  res.json({
    "barber": "Sistema Barbearia",
    "status": res.statusCode,
    "server_start": `${server_start}`
  })
})

//Notificação quando o agendamento é criado.
app.post('/webhook/create', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var payment = req.body.payment_method
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    if (payment === 'local') {
      payment = 'Pagamento Presencial'
    }

    var mensagem = `Olá *${name_client}*!

Como você está?
    
Somos da *Sistema de Agendamento* e gostaríamos de informar que seu agendamento com nosso barbeiro *${name_barber}* 💇🏻‍♂️ foi realizado com sucesso ✅

Estaremos te esperando no dia *${date}* às *${hour}h* 📆
    
Você agendou o serviço de *${service}*, com um tempo estimado de finalização de *${duration} minutos* ⏱️.
A forma de pagamento selecionada foi *${payment}* com o valor total de *${price}* 💵

Caso queira realizar o pagamento via *pix*:

🔑 *Chave PIX (CNPJ):* 32.438.386/0001-04

☑️ Feito o PIX, nos envie o comprovante, por gentileza!

*Endereço:*
📍 R. Sistema de Agendamento - São Paulo.
    
Até mais! 😄

Att,
*Sistema de Agendamento*.`

    var mensagem_reminder =
      `
*Informações do seu agendamento:*

*Barbeiro*: ${name_barber}.
*Serviço:* ${service}.
*Valor Total:* ${price}.
*Duração:* ${duration} min.
*Data do Agendamento:* ${date} às ${hour}`

    axios.post(`https://${host}/message/sendText?connectionKey=${key}`,
      {
        phoneNumber, message: mensagem, delayMessage: 5000
      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação do agendamento ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar o envio WhatsApp do agendamento ${req.body.booking_code}, informações do erro:${error}`) })

    new Reminder({
      booking_code: req.body.booking_code,
      date: date,
      hour: hour,
      phone: phoneNumber,
      message: mensagem_reminder,
      active: 'yes',
      sent: 'no'
    }).save().then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Agendamento ${req.body.booking_code} realizado com sucesso.`) }).catch(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar agendamento ${req.body.booking_code}.`) })
  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação. Erro: ${res.statusCode}`)
  }
})

//Notificação quando o agendamento é cancelado.
app.post('/webhook/cancellation', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    var message = `Olá, ${name_client} 😊

Poxa, vejo que o seu agendamento do dia *${date} às ${hour}* foi cancelado 😞

O seu barbeiro ${name_barber} já foi notificado referente ao cancelamento.

Estaremos sempre à disposição.

Att,
*Sistema de Agendamento*.`


    axios.post(`https://${host}/message/sendText?connectionKey=${key}`,
      {
        phoneNumber, message, delayMessage: 5000
      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação do cancelamento do agendamento ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(error) })

    Reminder.findOneAndUpdate({ booking_code: req.body.booking_code }, { active: 'no', sent: 'yes' })
      .then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | ${req.body.booking_code} foi cancelado com sucesso.`) })
      .catch(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar o cancelamento do agendamento ${req.body.booking_code}.`) })

  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação. Erro: ${res.statusCode}`)
  }
})

//Notificação quando a data do agendamento é alterada.
app.post('/webhook/rescheduling', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    var message = `Olá, *${name_client}* 😊

O seu reagendamento foi realizado com sucesso ✅

O seu barbeiro 💇🏻‍♂️ *${name_barber}* já foi notificado referente a nova data.

Estaremos te esperando no dia *${date}* às *${hour}* 📆

Você agendou o serviço de *${service}*, com um tempo estimado de finalização de *${duration} minutos* ⏱️.

*Endereço:*
📍 R. Sistema de Agendamento - São Paulo.
    
Até mais! 😄

Att,
*Sistema de Agendamento*.`


    axios.post(`https://${host}/message/sendText?connectionKey=${key}`,
      {
        phoneNumber, message, delayMessage: 5000
      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação do reagendamento ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(error) })

    Reminder.findOneAndUpdate({ booking_code: req.body.booking_code }, { date: date, hour: hour, sent: 'no', active: 'yes' })
      .then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | ${req.body.booking_code} foi atualizado com sucesso.`) })
      .catch(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar o reagendamento do agendamento ${req.body.booking_code}.`) })

  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação. Erro: ${res.statusCode}`)
  }
})

//Notificação quando o cliente não compareceu.
app.post('/webhook/wasnot', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    var message = `Poxa, vejo que você não compareceu ao seu agendamento do dia *${date} às ${hour}* 😞

Espero que esteja tudo bem com você, ${name_client} 🙏🏼

Para efetuar um novo agendamento acesse o nosso site www.a7m.com.br

Att,
*Sistema de Agendamento*.`


    axios.post(`https://${host}/message/sendText?connectionKey=${key}`,
      {
        phoneNumber, message, delayMessage: 5000
      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação do não comparecimento ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(error) })

    Reminder.findOneAndUpdate({ booking_code: req.body.booking_code }, { active: 'no', sent: 'yes' })
      .then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | ${req.body.booking_code} foi atualizado com sucesso.`) })
      .catch(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar o não comparecimento ${req.body.booking_code}.`) })

  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação. Erro: ${res.statusCode}`)
  }
})

//Enviar lembrete de agendamento para apenas 01 contato
// app.get('/webhook/reminder/:bookingid', (req, res) => {
//   const bookingId = req.params.bookingid
//   var data = ''
//   var phoneNumber = ''

//   if (bookingId != undefined) {

//     var sql = `SELECT * FROM wp_latepoint_reminders WHERE booking_code = "${bookingId}"`
//     conexao.query(sql, function (err, result) {
//       if (err) throw err;
//       data = result[0]
//       phoneNumber = data.phone
//       console.log(`${phoneNumber}"@s.whatsapp.net`)

//       axios.post('https://host05.serverapi.dev/message/sendText?connectionKey=w-api_MYQX6NCANN',
//         {
//           phoneNumber, message: "Heey @" + phoneNumber + "estou passando para avisar que você tem um agendamento confirmado para amanhã, ok? Estamos no aguardo rs\r\n"

//             +

//             data.message
//         })
//         .then(() => console.log(`Lembrete foi enviado com sucesso`))
//         .catch((error) => console.log(`Ops, erro ao enviar a notificação. ${error}`))
//     });
//     res.send('Lembrete enviado com sucesso!')
//   } else {
//     console.log('deu errado')
//   }
// })

app.get('/webhook/reminder/cron', (req, res) => {

  Reminder.find({ date: `${dayjs().add(1, 'day').format('DD/MM/YYYY')}`, active: `yes`, sent: `no` })
    .then((result) => {
      var numbers = []
      var bookingCodes = []

      if (result.length === 0) {
        console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Não possui nenhum agendamento para amanhã (CronJob)`)
        res.json(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Não possui nenhum agendamento para amanhã (CronJob)`)
      } else {
        result.forEach(booking => {
          numbers.push(booking.phone)
          bookingCodes.push(booking.booking_code)
        });

        axios.post(`https://${host}/message/sendTextMany?connectionKey=${key}`,
          {
            numbers, message: {
              text: `*⚠️ ATENÇÃO ⚠️*
Boa noite, tudo bem? Estamos passando para te lembrar que amanhã é o seu agendamento, ok? 
  
Para mais informações referente ao seu agendamento consulte nossas mensagens anteriores ou acesse o portal do cliente em nosso site: www.a7m.com.br/cliente.

Até amanhã! 😄

Att,
*Sistema de Agendamento*.`}, delayMessage: 9000
          })
          .then(() => {
            console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Lembrete dos agendamentos: ${bookingCodes} enviados com sucesso.`)

            Reminder.updateMany({ date: `${tomorrow}` }, { sent: 'yes' })
              .then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Coluna SENT dos agendamentos ${bookingCodes} atualizada com sucesso.`) })
              .catch((error) => { console.log(error) })

            res.json(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Lembrete dos agendamentos: ${bookingCodes} enviados com sucesso.`)

          })
      }
    }).catch((error) => console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Ops, erro ao enviar a notificação Cron dos Lembretes. ${error.message}`))


    .catch((error) => {
      console.log('Erro Global na função CRON LEMBRETE.')
      res.send('Erro Global na função CRON LEMBRETE.')
    })
})

//Enviar mensagem após finalização do serviço
app.post('/webhook/end', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    axios.post(`https://${host}/message/sendImageUrl?connectionKey=${key}`,
      {
        phoneNumber, url: "https://a7m.com.br/wp-content/uploads/2024/03/sistema-de-2.png", caption: `
*${name_client}*, esperamos que você tenha tido uma experiência agradável conosco 💛

Gostaríamos de saber sobre sua experiência e agradeceríamos muito se você dedicasse alguns segundos para fornecer o seu feedback.
        
Seu feedback é valioso para nós e nos ajuda a melhorar nossos serviços e atender melhor às suas necessidades.
        
*🌟 Faça a sua avaliação ✨*: {Inserir um Link Google Avaliação}
_Clique no link para ser redirecionado a página do Google Avaliações._
        
Muito obrigado pelo seu tempo e pela confiança 🙏🏼
        
Att,
*Sistema de Agendamento*.`

      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação para avaliação do ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar o envio WhatsApp da Avaliação do agendamento ${req.body.booking_code}, informações do erro:${error}`) })
  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação da Avaliação. Erro: ${res.statusCode}`)
  }
})

//Enviar mensagem para cliente inativo
app.post('/webhook/inactive', (req, res) => {

  function toMessage() {
    var phone = req.body.customer.phone
    var phoneNumber = phone.match(/\d/g).join("")
    var name_client = req.body.customer.full_name

    var name_barber = req.body.agent.full_name
    var price = req.body.price
    var service = req.body.service_name
    var duration = req.body.duration
    var date = req.body.start_date
    var hour = req.body.start_time

    var message = `Olá, *${name_client}*, tudo bem?

Poxa, vejo que a última vez que você passou pelo Sistema de Agendamento foi no dia *${date}* 😞

Que tal marcar seu horário? 🕙

Para realizar o seu agendamento acesse o nosso site www.zezinhosbarbearia.com.br e selecione o *serviço* e o *horário* desejado.

Qualquer dúvida estamos à disposição 😄

Att,
*Sistema de Agendamento*.`


    axios.post(`https://${host}/message/sendText?connectionKey=${key}`,
      {
        phoneNumber, message, delayMessage: 5000
      }).then(response => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Notificação de inatividade ${req.body.booking_code} realizada com sucesso.`) }).catch(error => { console.log(error) })

      .catch(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao realizar notf. Inatividade ${req.body.booking_code}.`) })

  }

  if (res.statusCode == 200) {
    res.send(toMessage())
  } else {
    console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Erro ao enviar a notificação. Erro: ${res.statusCode}`)
  }
})

app.listen(port, () => {
  console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Servidor OK - Funcionando Corretamente.`)
})

// var reminderesBooking = new CronJob('15 15 * * *', () => {


//   // Rotina Cron Job para lembrar que o cliente possui um agendamento marcado para a data de amanhã (Enviado todo dia às 19h00)
//   Reminder.find({ date: `${tomorrow}`, active: `yes`, sent: `no` })
//     .then((result) => {
//       var numbers = []
//       var bookingCodes = []

//       if (result.length === 0) {
//         console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Não possui nenhum agendamento para amanhã (CronJob)`)
//       } else {
//         result.forEach(booking => {
//           numbers.push(booking.phone)
//           bookingCodes.push(booking.booking_code)
//         });

//         axios.post('https://host05.serverapi.dev/message/sendTextMany?connectionKey=w-api_MYQX6NCANN',
//           {
//             numbers, message: {
//               text: `*⚠️ ATENÇÃO ⚠️*
// Boa noite, tudo bem? Estamos passando para te lembrar que amanhã é o seu agendamento, ok? 
    
// Para mais informações referente ao seu agendamento consulte nossas mensagens anteriores ou acesse nosso site ZezinhosBarbearia.com.br e logue em sua conta.
//     `}, delayMessage: 9000
//           })
//           .then(() => {
//             console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Lembrete dos agendamentos: ${bookingCodes} enviados com sucesso.`)

//             Reminder.updateMany({ date: `${tomorrow}` }, { sent: 'yes' })
//               .then(() => { console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Coluna SENT dos agendamentos ${bookingCodes} atualizada com sucesso.`) })
//               .catch((error) => { console.log(error) })

//           })
//       }
//     }).catch((error) => console.log(`${dayjs().format('DD/MM/YYYY - HH:mm:ss')} | Ops, erro ao enviar a notificação Cron dos Lembretes. ${error.message}`))


//     .catch((error) => {
//       console.log('Erro Global na função CRON LEMBRETE.')
//     })

// },
//   null,
//   true,
//   "America/Sao_Paulo"
// );

// reminderesBooking()