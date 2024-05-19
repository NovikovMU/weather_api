const supertest = require('supertest');
const request = supertest('http://localhost:3000/api/v1/');
const expect  = require('chai').expect;


describe('GET weather by lot, lan', () => {
    let lat = 0;
    let lon = 1;
    describe('succes enter querys', () => {
        it('without demand hour', (done) => {
            request
                .get(`coordinates/?lat=${lat}&lon=${lon}`).end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body).to.not.empty;
                    expect(res.body).to.be.an('object');
                    expect(res.body.data).to.be.an('array');
                    expect(res.body.lat).to.equal(lat);
                    expect(res.body.lon).to.equal(lon);
                    done();
                });
        });

        it('with demand hour', (done) => {
            let demand_hour = 3;
            request
                .get(`coordinates/?lat=${lat}&lon=${lon}&demand_hour=${demand_hour}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body).to.not.empty;
                    expect(res.body).to.be.an('object');
                    expect(res.body.data).to.be.an('array');
                    expect(res.body.lat).to.equal(lat);
                    expect(res.body.lon).to.equal(lon);
                    done();
                });
        });
    });

    describe('enter incorrect querys', () => {
        it('dont enter lon', (done) => {
            request
                .get(`coordinates/?&lat=${lat}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Отсутсвует значение долготы.');
                    done();
                });
        });

        it('enter lon with letter', (done) => {
            let lon_with_letter = 't16est';
            request
                .get(`coordinates/?&lon=${lon_with_letter}&lat=${lat}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Значениче долготы должно быть числом.');
                    done();
                });
        });

        it('enter huge lon', (done) => {
            let huge_lon = 1000;
            request
                .get(`coordinates/?&lon=${huge_lon}&lat=${lat}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to
                        .equal('Долгота должна быть в диапазоне [-180:180].');
                    done();
                });
        });

        it('dont enter lat', (done) => {
            request
                .get(`coordinates/?&lon=${lon}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Отсутсвует значение широты.');
                    done();
                });
        });
        it('enter lat with letter', (done) => {
            let lat_with_letter = 't1est';
            request
                .get(`coordinates/?&lon=${lon}&lat=${lat_with_letter}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Значениче широты должно быть числом.');
                    done();
                });
        });

        it('enter huge lat', (done) => {
            let huge_lat = 1000;
            request
                .get(`coordinates/?&lon=${lon}&lat=${huge_lat}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Широта должна быть в диапазоне [-90:90].');
                    done();
                });
        });

        it('enter greater_hour', (done) => {
            let greater_hour = 30;
            request
                .get(`coordinates/?&lat=${lat}&?&lon=${lon}&demand_hour=${greater_hour}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Время должно быть в диапазоне [0: 24).');
                    done();
                });
        });
        it('enter lower_hour', (done) => {
            let lower_hour = -3;
            request
                .get(`coordinates/?&lat=${lat}&?&lon=${lon}&demand_hour=${lower_hour}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Время должно быть в диапазоне [0: 24).');
                    done();
                });
        });
        it('enter float_hour', (done) => {
            let float_hour = 5.5;
            request
                .get(`coordinates/?&lat=${lat}&?&lon=${lon}&demand_hour=${float_hour}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error.message)
                        .to.equal('Время должно быть целочисленным.');
                    done();
                });
        });
    });
});

describe('GET weather by location', () => {
    describe('succes enter querys', () => {
        it('with country', (done) => {
            let city = 'Москва';
            let country = 'Россия'
            request
                .get(`locations/?&city=${city}&country=${country}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.body).to.not.empty;
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.equal(1);
                    expect(res.body[0]).to.be.an('object');
                    expect(res.body[0].data).to.be.an('array');
                    expect(res.body[0].city).to.equal(city);
                    expect(res.body[0].country).to.equal(country);
                    done();
                });
        });

        it('without country', (done) => {
            let city = 'Moscow';
            request
                .get(`locations/?&city=${city}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body.length).to.not.equal(1);
                    done();
                });
        });
    });
    describe('incorrect enter query', () => {
        it('city dont enter', (done) => {
            request
                .get(`locations/`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(400);
                    expect(res.body.error)
                        .to.equal('Вы не написали город.');
                    done();
                });
        });

        it('city dont found', (done) => {
            request
                .get(`locations/?city=asdasdaadfg`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(404);
                    expect(res.body.error)
                        .to.equal('По вашему запросу ничего не найдено.');
                    done();
                });
        });

        it('city dont found', (done) => {
            let unexist_city = 'asdsadsadasd'
            request
                .get(`locations/?city=${unexist_city}`)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.statusCode).to.be.equal(404);
                    expect(res.body.error)
                        .to.equal('По вашему запросу ничего не найдено.');
                    done();
                });
        });
    });
});
