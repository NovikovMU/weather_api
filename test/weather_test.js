const supertest = require('supertest');
const request = supertest('http://localhost:3000/api/v1/');
const { expect } = require('chai');

describe('coordinat', () => {
    it('GET v1/?&city=мск&country=россия&demand_hour=15', (done) => {
        request.get('v1/?&city=мск&country=россия&demand_hour=15').end((err, res) => {
            // Далее ваша проверка на свойство body
            expect(res.body.data).to.not.be.empty;

            done();
        });
    });
});
