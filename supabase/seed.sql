-- Lista de presentes inicial. Troque `gift_url` pelo link de pagamento real
-- de cada item — dá para fazer isso pelo painel dos noivos, em /admin.
insert into public.gifts (title, description, price_cents, category, gift_url, sort_order) values
('Cota da Lua de Mel', 'Ajude a gente a brindar o primeiro pôr do sol de casados.', 15000, 'Lua de Mel', 'https://exemplo.com/troque-este-link', 1),
('Jantar Romântico', 'Um jantar a dois durante a viagem — com direito a sobremesa.', 25000, 'Lua de Mel', 'https://exemplo.com/troque-este-link', 2),
('Jogo de Panelas', 'Para a Deysiane cozinhar e o Pedro dizer que ajudou.', 45000, 'Cozinha', 'https://exemplo.com/troque-este-link', 3),
('Jogo de Taças', 'Para os brindes que ainda vamos fazer em casa.', 12000, 'Cozinha', 'https://exemplo.com/troque-este-link', 4),
('Air Fryer', 'O eletrodoméstico que salva qualquer noite de domingo.', 55000, 'Cozinha', 'https://exemplo.com/troque-este-link', 5),
('Jogo de Cama Casal', 'Porque o melhor da casa é poder descansar nela.', 30000, 'Quarto', 'https://exemplo.com/troque-este-link', 6),
('Kit de Toalhas', 'Macias, felpudas e em dobro — como tem que ser.', 18000, 'Banho', 'https://exemplo.com/troque-este-link', 7),
('Cafeteira', 'Combustível oficial da nossa vida a dois.', 35000, 'Cozinha', 'https://exemplo.com/troque-este-link', 8),
('Vaso de Plantas', 'Um cantinho verde pra casa respirar.', 9000, 'Casa', 'https://exemplo.com/troque-este-link', 9),
('Cota Livre — Você escolhe o valor', 'Qualquer valor é carinho. De verdade.', null, 'Carinho', 'https://exemplo.com/troque-este-link', 10);
