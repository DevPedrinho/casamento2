-- "Acompanhante" entra na lista fechada de vínculo com os noivos, antes de
-- "Criança". Só acrescenta um valor: nenhum dado existente muda.
alter type public.vinculo add value if not exists 'acompanhante' before 'crianca';
