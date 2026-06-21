/* ============================================================
   countries.js — lista de países (ISO 3166-1) + bandeira emoji
   Exposto como window.Countries
   ============================================================ */
(function () {
  'use strict';

  // [código ISO alpha-2, nome em português]
  const LIST = [
    ['AF', 'Afeganistão'], ['ZA', 'África do Sul'], ['AL', 'Albânia'], ['DE', 'Alemanha'],
    ['AD', 'Andorra'], ['AO', 'Angola'], ['AI', 'Anguilla'], ['AG', 'Antígua e Barbuda'],
    ['SA', 'Arábia Saudita'], ['DZ', 'Argélia'], ['AR', 'Argentina'], ['AM', 'Armênia'],
    ['AW', 'Aruba'], ['AU', 'Austrália'], ['AT', 'Áustria'], ['AZ', 'Azerbaijão'],
    ['BS', 'Bahamas'], ['BH', 'Bahrein'], ['BD', 'Bangladesh'], ['BB', 'Barbados'],
    ['BE', 'Bélgica'], ['BZ', 'Belize'], ['BJ', 'Benin'], ['BM', 'Bermudas'],
    ['BY', 'Bielorrússia'], ['BO', 'Bolívia'], ['BA', 'Bósnia e Herzegovina'], ['BW', 'Botsuana'],
    ['BR', 'Brasil'], ['BN', 'Brunei'], ['BG', 'Bulgária'], ['BF', 'Burkina Faso'],
    ['BI', 'Burundi'], ['BT', 'Butão'], ['CV', 'Cabo Verde'], ['CM', 'Camarões'],
    ['KH', 'Camboja'], ['CA', 'Canadá'], ['QA', 'Catar'], ['KZ', 'Cazaquistão'],
    ['TD', 'Chade'], ['CL', 'Chile'], ['CN', 'China'], ['CY', 'Chipre'],
    ['CO', 'Colômbia'], ['KM', 'Comores'], ['CG', 'Congo'], ['CD', 'Congo (RD)'],
    ['KP', 'Coreia do Norte'], ['KR', 'Coreia do Sul'], ['CI', 'Costa do Marfim'], ['CR', 'Costa Rica'],
    ['HR', 'Croácia'], ['CU', 'Cuba'], ['CW', 'Curaçao'], ['DK', 'Dinamarca'],
    ['DJ', 'Djibuti'], ['DM', 'Dominica'], ['EG', 'Egito'], ['SV', 'El Salvador'],
    ['AE', 'Emirados Árabes Unidos'], ['EC', 'Equador'], ['ER', 'Eritreia'], ['SK', 'Eslováquia'],
    ['SI', 'Eslovênia'], ['ES', 'Espanha'], ['US', 'Estados Unidos'], ['EE', 'Estônia'],
    ['SZ', 'Essuatíni'], ['ET', 'Etiópia'], ['FJ', 'Fiji'], ['PH', 'Filipinas'],
    ['FI', 'Finlândia'], ['FR', 'França'], ['GA', 'Gabão'], ['GM', 'Gâmbia'],
    ['GH', 'Gana'], ['GE', 'Geórgia'], ['GI', 'Gibraltar'], ['GD', 'Granada'],
    ['GR', 'Grécia'], ['GL', 'Groenlândia'], ['GP', 'Guadalupe'], ['GU', 'Guam'],
    ['GT', 'Guatemala'], ['GG', 'Guernsey'], ['GY', 'Guiana'], ['GF', 'Guiana Francesa'],
    ['GN', 'Guiné'], ['GW', 'Guiné-Bissau'], ['GQ', 'Guiné Equatorial'], ['HT', 'Haiti'],
    ['NL', 'Holanda (Países Baixos)'], ['HN', 'Honduras'], ['HK', 'Hong Kong'], ['HU', 'Hungria'],
    ['YE', 'Iêmen'], ['IN', 'Índia'], ['ID', 'Indonésia'], ['IR', 'Irã'],
    ['IQ', 'Iraque'], ['IE', 'Irlanda'], ['IS', 'Islândia'], ['IL', 'Israel'],
    ['IT', 'Itália'], ['JM', 'Jamaica'], ['JP', 'Japão'], ['JE', 'Jersey'],
    ['JO', 'Jordânia'], ['KW', 'Kuwait'], ['LA', 'Laos'], ['LS', 'Lesoto'],
    ['LV', 'Letônia'], ['LB', 'Líbano'], ['LR', 'Libéria'], ['LY', 'Líbia'],
    ['LI', 'Liechtenstein'], ['LT', 'Lituânia'], ['LU', 'Luxemburgo'], ['MO', 'Macau'],
    ['MK', 'Macedônia do Norte'], ['MG', 'Madagascar'], ['MY', 'Malásia'], ['MW', 'Malávi'],
    ['MV', 'Maldivas'], ['ML', 'Mali'], ['MT', 'Malta'], ['MA', 'Marrocos'],
    ['MQ', 'Martinica'], ['MU', 'Maurício'], ['MR', 'Mauritânia'], ['MX', 'México'],
    ['MM', 'Myanmar (Birmânia)'], ['FM', 'Micronésia'], ['MZ', 'Moçambique'], ['MD', 'Moldávia'],
    ['MC', 'Mônaco'], ['MN', 'Mongólia'], ['ME', 'Montenegro'], ['MS', 'Montserrat'],
    ['NA', 'Namíbia'], ['NR', 'Nauru'], ['NP', 'Nepal'], ['NI', 'Nicarágua'],
    ['NE', 'Níger'], ['NG', 'Nigéria'], ['NO', 'Noruega'], ['NC', 'Nova Caledônia'],
    ['NZ', 'Nova Zelândia'], ['OM', 'Omã'], ['PW', 'Palau'], ['PS', 'Palestina'],
    ['PA', 'Panamá'], ['PG', 'Papua-Nova Guiné'], ['PK', 'Paquistão'], ['PY', 'Paraguai'],
    ['PE', 'Peru'], ['PF', 'Polinésia Francesa'], ['PL', 'Polônia'], ['PR', 'Porto Rico'],
    ['PT', 'Portugal'], ['KE', 'Quênia'], ['KG', 'Quirguistão'], ['KI', 'Kiribati'],
    ['GB', 'Reino Unido'], ['CF', 'República Centro-Africana'], ['DO', 'República Dominicana'], ['CZ', 'República Tcheca'],
    ['RE', 'Reunião'], ['RO', 'Romênia'], ['RW', 'Ruanda'], ['RU', 'Rússia'],
    ['EH', 'Saara Ocidental'], ['WS', 'Samoa'], ['AS', 'Samoa Americana'], ['SM', 'San Marino'],
    ['SH', 'Santa Helena'], ['LC', 'Santa Lúcia'], ['KN', 'São Cristóvão e Nevis'], ['ST', 'São Tomé e Príncipe'],
    ['VC', 'São Vicente e Granadinas'], ['SN', 'Senegal'], ['SL', 'Serra Leoa'], ['RS', 'Sérvia'],
    ['SC', 'Seicheles'], ['SG', 'Singapura'], ['SY', 'Síria'], ['SO', 'Somália'],
    ['LK', 'Sri Lanka'], ['SD', 'Sudão'], ['SS', 'Sudão do Sul'], ['SE', 'Suécia'],
    ['CH', 'Suíça'], ['SR', 'Suriname'], ['TH', 'Tailândia'], ['TW', 'Taiwan'],
    ['TJ', 'Tajiquistão'], ['TZ', 'Tanzânia'], ['TL', 'Timor-Leste'], ['TG', 'Togo'],
    ['TO', 'Tonga'], ['TT', 'Trinidad e Tobago'], ['TN', 'Tunísia'], ['TM', 'Turcomenistão'],
    ['TR', 'Turquia'], ['TV', 'Tuvalu'], ['UA', 'Ucrânia'], ['UG', 'Uganda'],
    ['UY', 'Uruguai'], ['UZ', 'Uzbequistão'], ['VU', 'Vanuatu'], ['VA', 'Vaticano'],
    ['VE', 'Venezuela'], ['VN', 'Vietnã'], ['ZM', 'Zâmbia'], ['ZW', 'Zimbábue'],
  ].sort((a, b) => a[1].localeCompare(b[1], 'pt'));

  const NAMES = {};
  LIST.forEach(([c, n]) => { NAMES[c] = n; });

  /* country code -> flag emoji (regional indicator symbols) */
  function flag(code) {
    if (!code) return '';
    return code.toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  }
  function name(code) { return NAMES[code] || ''; }
  function label(code) { return code ? (flag(code) + ' ' + name(code)) : ''; }

  window.Countries = { LIST, flag, name, label };
})();
