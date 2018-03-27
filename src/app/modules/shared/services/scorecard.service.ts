import { Injectable } from '@angular/core';
import {Observable} from 'rxjs/Observable';
import { ScoreCard } from '../models/scorecard';
import {DataService} from './data.service';
import {Store} from '@ngrx/store';
import {ApplicationState} from '../../store/application.state';
import {AddScorecardAction, UpdateLoadingAction, UpdateLoadingPercentAction} from '../../store/actions/store.data.action';
import * as _ from 'lodash';
import {HttpClientService} from './http-client.service';


@Injectable()
export class ScorecardService {

  _scorecards: ScoreCard[] = [];

  constructor(
    private http: HttpClientService,
    private dataService: DataService,
    private store: Store<ApplicationState>
  ) { }

  loadAll(): Observable<any> {
    return this.http.get('dataStore/scorecards');
  }

  load(id: string ): Observable<any> {
    return this.http.get(`dataStore/scorecards/${id}`);
  }

  getAllScoreCards(userInfo) {
    if ( this._scorecards.length !== 0 ) {
      this._scorecards.forEach( ( scorecard ) => {
        // this.store.dispatch(new AddScorecardAction( scorecard ));
      });
    }else {
      this.loadAll().subscribe(
        ( scorecards ) => {
          let scorecard_count = 0;
          scorecards.forEach((scorecard) => {
            // loading scorecard details
            this.load(scorecard).subscribe(
              (scorecard_details) => {
                const can_see = this.dataService.checkForUserGroupInScorecard(scorecard_details, userInfo).see;
                const can_edit = this.dataService.checkForUserGroupInScorecard(scorecard_details, userInfo).edit;
                this.addScorecardToStore(scorecard, scorecard_details, can_see, can_edit);
                this.dataService.sortArrOfObjectsByParam(this._scorecards, 'name', true);
                scorecard_count++;
                this.store.dispatch(new UpdateLoadingPercentAction(Math.floor((scorecard_count / scorecards.length) * 100)));
                // set loading equal to false when all scorecards are loaded
                if (scorecard_count === scorecards.length) {
                  this.store.dispatch(new UpdateLoadingAction( false ));
                }
              },
              // catch error if anything happens when loading scorecard details
              detail_error => {
                this.store.dispatch(new UpdateLoadingAction( false ));
              }
            );
          });
        },
        // catch error when there is no scorecard
        error => {
          this.store.dispatch(new UpdateLoadingAction( false ));
        }
      );
    }
  }

  addScorecardToStore(scorecardId, scorecard_details, can_see = true, can_edit = true) {
    const scorecard_item = {
      id: scorecardId,
      name: scorecard_details.header.title,
      data: scorecard_details,
      can_see: can_see,
      can_edit: can_edit,
      deleting: false,
      hoverState: 'notHovered',
      confirm_deleting: false,
      deleted: false,
      error_deleting: false
    };
    if ( can_see ) {
      this.store.dispatch(new AddScorecardAction(scorecard_item));
      if ( !_.find( this._scorecards, {'id': scorecardId} )) {
        this._scorecards.push(scorecard_item);
      }
    }
  }

  create(scorecard: ScoreCard) {
    return this.http.post('dataStore/scorecards/' + scorecard.id, scorecard.data);
  }

  update(scorecard: ScoreCard) {
    console.log(JSON.stringify(scorecard));
    return this.http.put(`dataStore/scorecards/${scorecard.id}`, scorecard.data);
  }

  remove(scorecard: ScoreCard) {
    return this.http.delete(`dataStore/scorecards/${scorecard.id}`);
  }

  addRelatedIndicator(indicator_id, related_indicators) {
    this.getRelatedIndicators(indicator_id).subscribe(
      // if it is available update the item in data store
      (data) => {
        this.updateRelatedIndicator(indicator_id, related_indicators).subscribe(
          returned_data => console.log('added'),
          error => console.log('something went wrong')
        );
      },
      // if it is not available add new item in datastore
      (error) => {
        this.createRelatedIndicator(indicator_id, related_indicators).subscribe(
          data => console.log('added'),
          errorr => console.log('something went wrong')
        );
      }
    );
  }

  getRelatedIndicators(indicator_id) {
    return this.http.get(`dataStore/scorecardRelatedIndicators/${indicator_id}`);
  }

  createRelatedIndicator(indicator_id, related_indicators) {
    return this.http.post('dataStore/scorecardRelatedIndicators/' + indicator_id, related_indicators);
  }

  updateRelatedIndicator(indicator_id, related_indicators) {
    return this.http.put('dataStore/scorecardRelatedIndicators/' + indicator_id, related_indicators);
  }

  // generate a random list of Id for use as scorecard id
  makeid(): string {
    let text = '';
    const possible_combinations = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( let i = 0; i < 11; i++ ) {
      text += possible_combinations.charAt(Math.floor(Math.random() * possible_combinations.length));
    }
    return text;
  }

  // Define default scorecard sample
  getEmptyScoreCard(): ScoreCard {
    return {
      id: this.makeid(),
      name: '',
      data: {
        'orgunit_settings': {
          'selection_mode': 'Usr_orgUnit',
          'selected_levels': [],
          'show_update_button': true,
          'selected_groups': [],
          'orgunit_levels': [],
          'orgunit_groups': [],
          'selected_orgunits': [],
          'user_orgunits': [],
          'type': 'report',
          'selected_user_orgunit': []
        },
        'average_selection': 'all',
        'shown_records': 'all',
        'show_average_in_row': false,
        'show_average_in_column': false,
        'periodType': 'Quarterly',
        'selected_periods': [{
          id: '2017Q1',
          name: 'January - March 2017'
        }],
        'show_data_in_column': false,
        'show_score': false,
        'show_rank': false,
        'rank_position_last': true,
        'header': {
          'title': '',
          'sub_title': '',
          'description': '',
          'show_arrows_definition': true,
          'show_legend_definition': true,
          'template': {
            'display': false,
            'content': ''
          }
        },
        'legendset_definitions': [
          {
            'color': '#008000',
            'definition': 'Target achieved / on track'
          },
          {
            'color': '#FFFF00',
            'definition': 'Progress, but more effort required'
          },
          {
            'color': '#FF0000',
            'definition': 'Not on track'
          },
          {
            'color': '#D3D3D3',
            'definition': 'N/A',
            'default': true
          },
          {
            'color': '#FFFFFF',
            'definition': 'No data',
            'default': true
          }
        ],
        'highlighted_indicators': {
          'display': false,
          'definitions': []
        },
        'data_settings': {
          'indicator_holders': [],
          'indicator_holder_groups': []
        },
        'additional_labels': [],
        'footer': {
          'display_generated_date': false,
          'display_title': false,
          'sub_title': null,
          'description': null,
          'template': null
        },
        'indicator_dataElement_reporting_rate_selection': 'Indicators',
        'user': {},
        'user_groups': []
      }
    };
  }

  // define a default indicator structure
  getIndicatorStructure(name: string, id: string, legendset: any = null, tittle: string = null): any {
    if ( tittle == null) {
      tittle = name;
    }
    return {
      'name': name,
      'id': id,
      'calculation': 'analytics',
      'function_to_use': '',
      'title': tittle,
      'high_is_good': true,
      'value': 0,
      'weight': 100,
      'legend_display': true,
      'legendset': legendset,
      'additional_label_values': {},
      'bottleneck_indicators': [],
      'arrow_settings': {
        'effective_gap': 5,
        'display': true
      },
      'label_settings': {
        'display': true,
        'font_size': ''
      }
    };

  }


}
