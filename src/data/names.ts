// Noms ficticis per a líders i personatges, per àrea cultural
const P: Record<string, [string[], string[]]> = {
  es: [['Pau', 'Lucía', 'Javier', 'Carmen', 'Andrés', 'Elena', 'Sergio', 'Marta', 'Diego', 'Isabel', 'Raúl', 'Nuria'],
    ['Sandoval', 'Ferrer', 'Iglesias', 'Molina', 'Castaño', 'Ortega', 'Navarro', 'Robles', 'Vidal', 'Serrano', 'Montero', 'Paredes']],
  fr: [['Émile', 'Claire', 'Julien', 'Sophie', 'Antoine', 'Camille', 'Mathieu', 'Léa', 'Olivier', 'Margaux'],
    ['Lacroix', 'Moreau', 'Delmas', 'Fontaine', 'Girard', 'Rousseau', 'Bertin', 'Marchand', 'Perrin', 'Lemaire']],
  de: [['Klaus', 'Annika', 'Friedrich', 'Sabine', 'Jonas', 'Katrin', 'Markus', 'Lena', 'Stefan', 'Ursula'],
    ['Hartmann', 'Becker', 'Wolff', 'Richter', 'Krämer', 'Vogt', 'Neumann', 'Scholz', 'Brandt', 'Lindner']],
  en: [['Edward', 'Sarah', 'James', 'Emily', 'Douglas', 'Rachel', 'Thomas', 'Megan', 'Andrew', 'Laura', 'Michael', 'Helen'],
    ['Harlow', 'Whitfield', 'Carter', 'Bennett', 'Hartley', 'Morgan', 'Albury', 'Kearney', 'Lawson', 'Pierce', 'Reynolds', 'Hughes']],
  it: [['Giorgia', 'Marco', 'Chiara', 'Luca', 'Francesca', 'Matteo', 'Elena', 'Davide', 'Silvia', 'Paolo'],
    ['Martelli', 'Rossi', 'Bianchi', 'Ferraro', 'Colombo', 'Ricci', 'Greco', 'Conti', 'Gallo', 'Marino']],
  pt: [['Luís', 'Ana', 'João', 'Beatriz', 'Antônio', 'Mariana', 'Pedro', 'Inês', 'Rafael', 'Carla'],
    ['Valadares', 'Ferraz', 'Souza', 'Almeida', 'Carvalho', 'Ribeiro', 'Teixeira', 'Moura', 'Barros', 'Pinto']],
  zh: [['Wenhao', 'Mei', 'Jian', 'Xiulan', 'Wei', 'Lihua', 'Zhiwei', 'Yan', 'Hao', 'Ling'],
    ['Li', 'Wang', 'Zhang', 'Liu', 'Chen', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Sun']],
  ja: [['Haruka', 'Kenji', 'Yuki', 'Takeshi', 'Aiko', 'Hiroshi', 'Naomi', 'Daisuke', 'Emi', 'Shinji'],
    ['Takamura', 'Ishikawa', 'Kobayashi', 'Fujimoto', 'Nakagawa', 'Saito', 'Matsuda', 'Hayashi', 'Ono', 'Mori']],
  hi: [['Naresh', 'Priya', 'Rahul', 'Anjali', 'Vikram', 'Sunita', 'Arjun', 'Kavita', 'Rajesh', 'Meera'],
    ['Mehta', 'Sharma', 'Verma', 'Iyer', 'Reddy', 'Kapoor', 'Nair', 'Joshi', 'Patel', 'Rao']],
  ru: [['Viktor', 'Olga', 'Dmitri', 'Irina', 'Sergei', 'Natalia', 'Pavel', 'Yelena', 'Andrei', 'Tatiana'],
    ['Pastukhov', 'Volkov', 'Sokolov', 'Morozov', 'Lebedev', 'Kuznetsov', 'Orlov', 'Belov', 'Zaitsev', 'Gromov']],
  tr: [['Mehmet', 'Ayşe', 'Mustafa', 'Elif', 'Ahmet', 'Zeynep', 'Emre', 'Fatma', 'Burak', 'Selin'],
    ['Kaya', 'Yılmaz', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Koç']],
  ko: [['Ji-hoon', 'Seo-yeon', 'Min-jun', 'Ha-eun', 'Dong-hyun', 'Ji-woo', 'Sung-ho', 'Myong-su', 'Song-chol', 'Eun-ji'],
    ['Park', 'Kim', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Ri', 'Han', 'Shin']],
  za: [['Sipho', 'Thandiwe', 'Johan', 'Naledi', 'Pieter', 'Lerato', 'Themba', 'Zanele', 'Kagiso', 'Annelie'],
    ['Mabaso', 'Dlamini', 'Botha', 'Nkosi', 'van Wyk', 'Mokoena', 'Khumalo', 'Ndlovu', 'Pretorius', 'Zulu']],
  ng: [['Adebayo', 'Ngozi', 'Chinedu', 'Funmilayo', 'Ibrahim', 'Amina', 'Emeka', 'Yetunde', 'Musa', 'Chiamaka'],
    ['Okonkwo', 'Adeyemi', 'Bello', 'Okafor', 'Abubakar', 'Eze', 'Ogunleye', 'Danjuma', 'Nwosu', 'Lawal']],
  ar: [['Karim', 'Layla', 'Faisal', 'Noura', 'Omar', 'Rania', 'Khalid', 'Huda', 'Tarek', 'Salma'],
    ['El-Masri', 'bin Khalid', 'Haddad', 'Al-Rashid', 'Mansour', 'Farouk', 'Nasser', 'Saleh', 'Hamdan', 'Aziz']],
  fa: [['Ali', 'Maryam', 'Reza', 'Shirin', 'Hossein', 'Leila', 'Mehdi', 'Parisa', 'Saeed', 'Nasrin'],
    ['Hosseini', 'Rahimi', 'Karimi', 'Moradi', 'Jafari', 'Tehrani', 'Ahmadi', 'Rostami', 'Sadeghi', 'Bagheri']],
  pl: [['Tadeusz', 'Agnieszka', 'Piotr', 'Katarzyna', 'Marek', 'Magdalena', 'Tomasz', 'Ewa', 'Krzysztof', 'Joanna'],
    ['Nowicki', 'Kowalski', 'Wiśniewski', 'Zieliński', 'Kamiński', 'Lewandowska', 'Wójcik', 'Mazur', 'Krawczyk', 'Dąbrowski']],
  sv: [['Henrik', 'Ingrid', 'Jonas', 'Astrid', 'Lars', 'Sigrid', 'Erik', 'Maja', 'Nils', 'Karin'],
    ['Lindqvist', 'Haldorsen', 'Andersson', 'Berg', 'Johansen', 'Nyström', 'Solberg', 'Eriksen', 'Holm', 'Dahl']],
  uk: [['Oleksandr', 'Oksana', 'Taras', 'Iryna', 'Mykola', 'Yulia', 'Bohdan', 'Kateryna', 'Petro', 'Halyna'],
    ['Melnyk', 'Shevchenko', 'Bondarenko', 'Kovalenko', 'Tkachenko', 'Kravchuk', 'Lysenko', 'Moroz', 'Savchenko', 'Marchenko']],
  id: [['Bambang', 'Siti', 'Agus', 'Dewi', 'Budi', 'Ratna', 'Joko', 'Sri', 'Hendra', 'Wulan'],
    ['Prasetyo', 'Santoso', 'Wijaya', 'Hidayat', 'Kusuma', 'Saputra', 'Nugroho', 'Setiawan', 'Gunawan', 'Halim']],
  nl: [['Ruben', 'Femke', 'Pieter', 'Sanne', 'Joost', 'Lotte', 'Bram', 'Anouk', 'Daan', 'Marieke'],
    ['Jansen', 'de Vries', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos']],
};

export function randomName(pool: string): string {
  const [f, l] = P[pool] ?? P.en;
  return `${f[Math.floor(Math.random() * f.length)]} ${l[Math.floor(Math.random() * l.length)]}`;
}

export const MEDIA = {
  free: ['La Veu Lliure', 'Diari del Matí', 'Crònica Nacional', 'El Observador', 'Ràdio Pública', 'Canal 24 Hores'],
  world: ['Agència Mundial de Notícies', 'Global Wire', 'The World Ledger', 'Corresponsals Internacionals'],
  state: ['Agència Oficial de l\'Estat', 'Televisió Nacional', 'La Veu del Poble', 'Diari Oficial'],
  opp: ['Fulls Clandestins', 'Ràdio Exili', 'Xarxa de la Resistència'],
};

export function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
