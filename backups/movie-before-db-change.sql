--
-- PostgreSQL database dump
--

\restrict ix4aTV9wFtJFaaTKkctPLmjg8AxVOWAHILEG1HJSU3lqUW3aKhGSC6cMgpJZczJ

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: movies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movies (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    genre character varying(100),
    duration_minutes integer NOT NULL,
    age_rating character varying(20),
    synopsis text,
    poster_image text,
    release_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.movies OWNER TO postgres;

--
-- Name: movies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movies_id_seq OWNER TO postgres;

--
-- Name: movies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movies_id_seq OWNED BY public.movies.id;


--
-- Name: order_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_details (
    id integer NOT NULL,
    order_id integer NOT NULL,
    screening_id integer NOT NULL,
    seat_num character varying(20) NOT NULL,
    ticket_num integer NOT NULL,
    price integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_details OWNER TO postgres;

--
-- Name: order_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_details_id_seq OWNER TO postgres;

--
-- Name: order_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_details_id_seq OWNED BY public.order_details.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    order_num character varying(100) NOT NULL,
    pay_datetime timestamp without time zone,
    total_price integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    pay_method character varying(50) NOT NULL,
    pay_num character varying(100) NOT NULL,
    pay_status character varying(20) NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: reservation_seats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation_seats (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    screening_id character varying(100) NOT NULL,
    seat_label character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    released_at timestamp without time zone
);


ALTER TABLE public.reservation_seats OWNER TO postgres;

--
-- Name: reservation_seats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservation_seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_seats_id_seq OWNER TO postgres;

--
-- Name: reservation_seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservation_seats_id_seq OWNED BY public.reservation_seats.id;


--
-- Name: reservation_ticket_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservation_ticket_types (
    id integer NOT NULL,
    reservation_id integer NOT NULL,
    ticket_type_id character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    unit_price integer DEFAULT 0 NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reservation_ticket_types_quantity CHECK ((quantity > 0))
);


ALTER TABLE public.reservation_ticket_types OWNER TO postgres;

--
-- Name: reservation_ticket_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservation_ticket_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservation_ticket_types_id_seq OWNER TO postgres;

--
-- Name: reservation_ticket_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservation_ticket_types_id_seq OWNED BY public.reservation_ticket_types.id;


--
-- Name: reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    user_id integer,
    user_email character varying(255),
    movie_id character varying(100) NOT NULL,
    screening_id character varying(100) NOT NULL,
    screen_name character varying(100),
    screening_time character varying(50),
    ticket_count integer DEFAULT 0 NOT NULL,
    ticket_total_price integer DEFAULT 0 NOT NULL,
    food_total_price integer DEFAULT 0 NOT NULL,
    total_price integer DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'reserved'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reservations OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservations_id_seq OWNER TO postgres;

--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: screenings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screenings (
    id integer NOT NULL,
    movie_id integer NOT NULL,
    theater_id integer NOT NULL,
    screening_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    screen_name character varying(100) NOT NULL,
    total_seats integer NOT NULL,
    remaining_seats integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.screenings OWNER TO postgres;

--
-- Name: screenings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.screenings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.screenings_id_seq OWNER TO postgres;

--
-- Name: screenings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screenings_id_seq OWNED BY public.screenings.id;


--
-- Name: seats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seats (
    id integer NOT NULL,
    screening_id integer NOT NULL,
    row_name character(1) NOT NULL,
    col_num integer NOT NULL,
    seat_label character varying(10) NOT NULL,
    is_reserved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.seats OWNER TO postgres;

--
-- Name: seats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seats_id_seq OWNER TO postgres;

--
-- Name: seats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seats_id_seq OWNED BY public.seats.id;


--
-- Name: theaters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.theaters (
    id integer NOT NULL,
    theater_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.theaters OWNER TO postgres;

--
-- Name: theaters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.theaters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.theaters_id_seq OWNER TO postgres;

--
-- Name: theaters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.theaters_id_seq OWNED BY public.theaters.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: movies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movies ALTER COLUMN id SET DEFAULT nextval('public.movies_id_seq'::regclass);


--
-- Name: order_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details ALTER COLUMN id SET DEFAULT nextval('public.order_details_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: reservation_seats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_seats ALTER COLUMN id SET DEFAULT nextval('public.reservation_seats_id_seq'::regclass);


--
-- Name: reservation_ticket_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_ticket_types ALTER COLUMN id SET DEFAULT nextval('public.reservation_ticket_types_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: screenings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenings ALTER COLUMN id SET DEFAULT nextval('public.screenings_id_seq'::regclass);


--
-- Name: seats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats ALTER COLUMN id SET DEFAULT nextval('public.seats_id_seq'::regclass);


--
-- Name: theaters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.theaters ALTER COLUMN id SET DEFAULT nextval('public.theaters_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: movies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.movies (id, title, genre, duration_minutes, age_rating, synopsis, poster_image, release_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_details (id, order_id, screening_id, seat_num, ticket_num, price, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, user_id, order_num, pay_datetime, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, pay_method, pay_num, pay_status, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: reservation_seats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservation_seats (id, reservation_id, screening_id, seat_label, created_at, released_at) FROM stdin;
1	1	scr-2-s2-1340	A-12	2026-06-30 08:06:10.183514	2026-07-03 02:29:40.845994
2	1	scr-2-s2-1340	A-13	2026-06-30 08:06:10.183514	2026-07-03 02:29:40.845994
3	1	scr-2-s2-1340	A-14	2026-06-30 08:06:10.183514	2026-07-03 02:29:40.845994
4	2	scr-2-s2-1010	A-10	2026-07-03 03:03:59.112166	2026-07-03 03:04:17.62565
5	2	scr-2-s2-1010	A-11	2026-07-03 03:03:59.112166	2026-07-03 03:04:17.62565
\.


--
-- Data for Name: reservation_ticket_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservation_ticket_types (id, reservation_id, ticket_type_id, label, unit_price, quantity, created_at) FROM stdin;
1	2	general	一般	1800	2	2026-07-03 03:03:59.112166
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservations (id, user_id, user_email, movie_id, screening_id, screen_name, screening_time, ticket_count, ticket_total_price, food_total_price, total_price, status, created_at) FROM stdin;
1	1	test@example.com	movie-001	scr-2-s2-1340	スクリーン 2	13:40	3	5400	0	5400	canceled	2026-06-30 08:06:10.183514
2	1	test@example.com	movie-001	scr-2-s2-1010	スクリーン 2	10:10	2	3600	0	3600	canceled	2026-07-03 03:03:59.112166
\.


--
-- Data for Name: screenings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.screenings (id, movie_id, theater_id, screening_date, start_time, end_time, screen_name, total_seats, remaining_seats, created_at) FROM stdin;
\.


--
-- Data for Name: seats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seats (id, screening_id, row_name, col_num, seat_label, is_reserved, created_at) FROM stdin;
\.


--
-- Data for Name: theaters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.theaters (id, theater_name, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, created_at) FROM stdin;
1	test	test@example.com	scrypt:32768:8:1$6EDepgXrpE1zF6iu$5db950e603054e10b5733fce2072cbbf8ac715adee2efd2373cee5f26332edcfe615d2ff760bed53c87cae1974fffbff4876c9b1520b955c71fcd8aee857a725	2026-06-19 01:21:51.953439
\.


--
-- Name: movies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movies_id_seq', 1, false);


--
-- Name: order_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_details_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: reservation_seats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_seats_id_seq', 5, true);


--
-- Name: reservation_ticket_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservation_ticket_types_id_seq', 1, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservations_id_seq', 2, true);


--
-- Name: screenings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.screenings_id_seq', 1, false);


--
-- Name: seats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seats_id_seq', 1, false);


--
-- Name: theaters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.theaters_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: movies movies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movies
    ADD CONSTRAINT movies_pkey PRIMARY KEY (id);


--
-- Name: order_details order_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_num_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_num_key UNIQUE (order_num);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pay_num_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pay_num_key UNIQUE (pay_num);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: reservation_seats reservation_seats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_seats
    ADD CONSTRAINT reservation_seats_pkey PRIMARY KEY (id);


--
-- Name: reservation_ticket_types reservation_ticket_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_ticket_types
    ADD CONSTRAINT reservation_ticket_types_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: screenings screenings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenings
    ADD CONSTRAINT screenings_pkey PRIMARY KEY (id);


--
-- Name: seats seats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT seats_pkey PRIMARY KEY (id);


--
-- Name: theaters theaters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.theaters
    ADD CONSTRAINT theaters_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_reservation_seats_screening_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_seats_screening_id ON public.reservation_seats USING btree (screening_id);


--
-- Name: idx_reservation_ticket_types_reservation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservation_ticket_types_reservation_id ON public.reservation_ticket_types USING btree (reservation_id);


--
-- Name: idx_reservations_screening_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reservations_screening_id ON public.reservations USING btree (screening_id);


--
-- Name: uq_reservation_seats_screening_seat_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_reservation_seats_screening_seat_active ON public.reservation_seats USING btree (screening_id, seat_label) WHERE (released_at IS NULL);


--
-- Name: order_details fk_order_details_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT fk_order_details_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_details fk_order_details_screening; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT fk_order_details_screening FOREIGN KEY (screening_id) REFERENCES public.screenings(id) ON DELETE CASCADE;


--
-- Name: orders fk_orders_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments fk_payments_order; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: reservation_seats fk_reservation_seats_reservation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_seats
    ADD CONSTRAINT fk_reservation_seats_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reservation_ticket_types fk_reservation_ticket_types_reservation; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservation_ticket_types
    ADD CONSTRAINT fk_reservation_ticket_types_reservation FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;


--
-- Name: reservations fk_reservations_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: screenings fk_screenings_movie; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenings
    ADD CONSTRAINT fk_screenings_movie FOREIGN KEY (movie_id) REFERENCES public.movies(id) ON DELETE CASCADE;


--
-- Name: screenings fk_screenings_theater; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screenings
    ADD CONSTRAINT fk_screenings_theater FOREIGN KEY (theater_id) REFERENCES public.theaters(id) ON DELETE CASCADE;


--
-- Name: seats fk_seats_screening; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT fk_seats_screening FOREIGN KEY (screening_id) REFERENCES public.screenings(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ix4aTV9wFtJFaaTKkctPLmjg8AxVOWAHILEG1HJSU3lqUW3aKhGSC6cMgpJZczJ
