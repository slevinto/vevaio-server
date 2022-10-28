/** @type {import('tailwindcss').Config} */
import { colors } from 'tailwindcss/colors'

module.exports = {
  mode: 'jit',
  content: ["./src/views/*.pug"],
  theme: {
   extend: {
     },
     colors: {
       
       'sky':"#0097FE"
    }
  }
}