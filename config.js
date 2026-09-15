window.CURSO_CONFIG = {
  adminEmails: ["diel_zi_nho25@hotmail.com"],
  firebaseConfig: {
    apiKey: "AIzaSyBxso7K5VIgvm42eeOfcERThD5iIg303GI",
    authDomain: "balanco-roupas-eeead.firebaseapp.com",
    databaseURL: "https://balanco-roupas-eeead-default-rtdb.firebaseio.com",
    projectId: "balanco-roupas-eeead",
    storageBucket: "balanco-roupas-eeead.appspot.com",
    messagingSenderId: "121260928467",
    appId: "1:121260928467:web:de385da60551646f671326"
  },
  paymentBackendUrl: "https://backend-curso.onrender.com",
  // A Public Key é buscada com segurança no endpoint /payments/config do backend.
  payment: { methods: ["credit_card", "pix"], currency: "BRL" }
};
