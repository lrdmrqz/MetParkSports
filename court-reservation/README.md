# MetParkSports - Court Reservation System (MERN)

Target client (sample): MET Park Sports Center, Pasay City.
Stack: MongoDB, Express, React, Node.js.

## Folders
```
court-reservation/
  server/   backend (Express + Mongoose)
  client/   frontend (React, created with create-react-app)
```

## Run
1. Start MongoDB (the service must be running).
2. Backend:   cd server  ->  npm install  ->  node seed.js  ->  npx nodemon server.js
3. Frontend:  cd client  ->  npm install react@18 react-dom@18 axios react-router-dom@6 antd@5  ->  npm start

`node seed.js` DELETES all data and inserts the clean demo data (run it again before the presentation).

## Demo accounts (all use the password  Password@123)
| Role | Email | Username |
|---|---|---|
| Admin | roberto.villanueva@yopmail.com | roberto.admin |
| Admin | angelica.reyes@yopmail.com | angelica.admin |
| Staff | liza.santos@yopmail.com | liza.staff |
| Staff | carlo.mendoza@yopmail.com | carlo.staff |
| Staff | jasmine.aquino@yopmail.com | jasmine.staff |
| Customer | juan.delacruz@yopmail.com | |

Staff and admin PIN: 123456.  Customer security answer: bantay.
(Other customers: ana.santos, mark.reyes, princess.delacruz, kristine.bautista, paolo.fernandez, bea.gonzales, miguel.torres @yopmail.com)

## Roles
- Customer: browse courts and equipment, book with the color calendar, pay a 50% downpayment, cancel (refund if 3+ days before).
- Staff: verify payments, confirm, collect the balance, complete, cancel, manage courts and equipment, archive. Sees sales by period (today, yesterday, last 7 days, this month).
- Admin: monitors only. Sales and analytics, reports, court monitoring, accounts (add staff, reset PIN, archive users).

## Rules (server/config/rules.js)
50% downpayment, unpaid reservations expire after 12 hours, refund if cancelled 3+ days before,
reserve 2+ days ahead, PHP 50 door charge per head, open 7:00 AM - 12:00 midnight,
PIN locks for 15 minutes after 5 wrong attempts.

## If the only admin forgets the PIN
cd server  ->  node resetPin.js admin-email@yopmail.com
